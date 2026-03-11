from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, text
import firebase_admin
from typing import List, Optional
from datetime import datetime
import io
import csv
import models, schemas, auth, database, ocr
from database import engine, get_db

from fastapi.middleware.cors import CORSMiddleware
import httpx
import time

# Currency Cache
currency_cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_TTL = 3600 # 1 hour

# Initialize Firebase
auth.init_firebase()

models.Base.metadata.create_all(bind=engine)

# Migration: Add detailed columns to expenses if missing
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tax_amount FLOAT DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS net_amount FLOAT DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS other_taxes FLOAT DEFAULT 0.0"))
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor VARCHAR(255)"))
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100)"))
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)"))
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pagado'"))
        conn.execute(text("ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE"))
        conn.commit()
    except Exception as e:
        print(f"Migration notice (Detailed fields): {e}")

app = FastAPI(title="Expense Tracker API")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Expense Tracker API"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check DB
        db.execute(text("SELECT 1"))
        # Check Firebase
        firebase_ok = len(firebase_admin._apps) > 0
        return {
            "status": "ok",
            "database": "connected",
            "firebase": "initialized" if firebase_ok else "not_initialized",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# Example protected route
@app.get("/users/me", response_model=schemas.User)
def read_user_me(db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    user = db.query(models.User).filter(models.User.firebase_uid == current_user["uid"]).first()
    if not user:
        # Auto-register if not exists (Firebase user is primary)
        user = models.User(
            firebase_uid=current_user["uid"],
            email=current_user["email"],
            name=current_user.get("name", "User")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

# Expenses Endpoints
@app.get("/expenses", response_model=List[schemas.Expense])
@app.get("/expenses/", response_model=List[schemas.Expense])
def read_expenses(
    category_id: Optional[str] = None,
    vendor: Optional[str] = None,
    receipt_number: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    due_start_date: Optional[str] = None,
    due_end_date: Optional[str] = None,
    payment_method: Optional[str] = None,
    status: Optional[str] = None,
    description: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    print(f"FETCH EXPENSES: User {current_user['uid']} filtering by Cat={category_id}, Vendor={vendor}, Skip={skip}, Limit={limit}")
    
    # Parse dates manually to avoid parsing errors
    def p_date(ds):
        if not ds: return None
        try: return datetime.fromisoformat(ds.replace('Z', '+00:00'))
        except: 
            try: return datetime.strptime(ds, "%Y-%m-%d")
            except: return None

    query = get_filtered_expenses_query(
        db=db,
        user_uid=current_user["uid"],
        category_id=category_id,
        vendor=vendor,
        receipt_number=receipt_number,
        start_date=p_date(start_date),
        end_date=p_date(end_date),
        due_start_date=p_date(due_start_date),
        due_end_date=p_date(due_end_date),
        payment_method=payment_method,
        status=status,
        description=description,
        min_amount=min_amount,
        max_amount=max_amount
    )
    
    total = query.count()
    results = query.order_by(models.Expense.date.desc()).offset(skip).limit(limit).all()
    print(f"FETCH EXPENSES: Found {len(results)} matches (Total: {total})")
    # We can return a custom response or just headers. Let's return a dict for simplicity in this case if needed, 
    # but the current schema is List[Expense]. To keep it compatible without changing many things, 
    # I'll stick to List[Expense] and maybe use a header for total or just let frontend handle it if it doesn't need 'total pages' yet, 
    # but 'Next' button needs to know if there's more.
    # Actually, returning a dict { "items": [], "total": X } is better if we want proper pagination.
    # Let's check schemas.py to see if I should change the response model.
    return results

@app.post("/expenses/", response_model=schemas.Expense)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    db_expense = models.Expense(**expense.model_dump(), user_uid=current_user["uid"])
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.put("/expenses/{expense_id}", response_model=schemas.Expense)
def update_expense(expense_id: str, expense: schemas.ExpenseCreate, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_uid == current_user["uid"]).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for key, value in expense.model_dump().items():
        setattr(db_expense, key, value)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@app.post("/expenses/batch-delete")
@app.post("/expenses/batch-delete/")
def batch_delete_expenses(req: schemas.BatchDeleteRequest, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    print(f"BATCH DELETE: User {current_user['uid']} requested IDs: {req.ids}")
    db_expenses = db.query(models.Expense).filter(
        models.Expense.id.in_(req.ids), 
        models.Expense.user_uid == current_user["uid"]
    ).all()
    
    count = len(db_expenses)
    print(f"BATCH DELETE: Found {count} expenses to delete")
    
    # Use bulk delete for efficiency
    db.query(models.Expense).filter(
        models.Expense.id.in_(req.ids), 
        models.Expense.user_uid == current_user["uid"]
    ).delete(synchronize_session=False)
    
    db.commit()
    print(f"BATCH DELETE: Successfully committed deletion")
    return {"message": f"{count} facturaciones eliminadas correctamente"}

@app.delete("/expenses/{expense_id}")
def delete_expense(expense_id: str, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    db_expense = db.query(models.Expense).filter(models.Expense.id == expense_id, models.Expense.user_uid == current_user["uid"]).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(db_expense)
    db.commit()
    return {"message": "Expense deleted"}

@app.get("/expenses/stats", response_model=schemas.ExpenseStats)
def get_stats(month: int, year: int, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    # Current month expenses
    expenses = db.query(models.Expense).filter(
        models.Expense.user_uid == current_user["uid"],
        func.extract('month', models.Expense.date) == month,
        func.extract('year', models.Expense.date) == year
    ).all()
    
    # Previous month expenses for comparison
    prev_month = month - 1 if month > 1 else 12
    prev_year = year if month > 1 else year - 1
    prev_expenses = db.query(models.Expense).filter(
        models.Expense.user_uid == current_user["uid"],
        func.extract('month', models.Expense.date) == prev_month,
        func.extract('year', models.Expense.date) == prev_year
    ).all()
    
    total = sum(e.amount for e in expenses)
    prev_total = sum(e.amount for e in prev_expenses)
    
    # Totals by category
    categories = db.query(models.Category).all()
    by_category = []
    category_map = {c.id: c for c in categories}
    cat_totals = {}
    for e in expenses:
        cat_totals[e.category_id] = cat_totals.get(e.category_id, 0) + e.amount
    
    # Fetch budgets for this month
    budgets = db.query(models.Budget).filter(
        models.Budget.user_uid == current_user["uid"],
        models.Budget.month == month,
        models.Budget.year == year
    ).all()
    budget_map = {b.category_id: b.amount for b in budgets}
    
    for cat_id, cat_total in cat_totals.items():
        cat = category_map.get(cat_id)
        if cat:
            by_category.append({
                "name": cat.name,
                "color": cat.color,
                "total": cat_total,
                "budget": budget_map.get(cat_id, 0),
                "count": len([e for e in expenses if e.category_id == cat_id])
            })
            
    # Daily Totals
    import calendar
    _, last_day = calendar.monthrange(year, month)
    daily_map = {i: 0.0 for i in range(1, last_day + 1)}
    for e in expenses:
        daily_map[e.date.day] += e.amount
    
    daily_totals = []
    cumulative = 0
    for day in range(1, last_day + 1):
        cumulative += daily_map[day]
        daily_totals.append({
            "date": f"{year}-{month:02d}-{day:02d}",
            "amount": daily_map[day],
            "cumulative": cumulative
        })
        
    # Weekly Totals
    weekly_map = {}
    for e in expenses:
        week = e.date.isocalendar()[1]
        weekly_map[week] = weekly_map.get(week, 0) + e.amount
    
    weekly_totals = [{"week": f"S{w}", "amount": amt} for w, amt in sorted(weekly_map.items())]
    
    # Alerts
    alerts = []
    for cat_id, budget_amt in budget_map.items():
        spent = cat_totals.get(cat_id, 0)
        pct = round((spent / budget_amt) * 100) if budget_amt > 0 else 0
        if pct >= 80:
            cat = category_map.get(cat_id)
            alerts.append({
                "category": cat.name if cat else "Unknown",
                "budget": budget_amt,
                "spent": spent,
                "percentage": pct
            })

    # Recent expenses
    expenses_sorted = sorted(expenses, key=lambda x: x.date, reverse=True)
    recent = expenses_sorted[:5]
    all_time = db.query(models.Expense).filter(models.Expense.user_uid == current_user["uid"]).order_by(models.Expense.date.desc()).limit(5).all()
    
    top = None
    if expenses:
        top_e = max(expenses, key=lambda x: x.amount)
        cat = category_map.get(top_e.category_id)
        top = {"amount": top_e.amount, "description": top_e.description, "category": cat.name if cat else "Uncategorized"}

    return {
        "total": total,
        "prevTotal": prev_total,
        "totalBudget": sum(budget_map.values()),
        "count": len(expenses),
        "byCategory": by_category,
        "dailyTotals": daily_totals,
        "weeklyTotals": weekly_totals,
        "alerts": alerts,
        "recentExpenses": recent,
        "allTimeRecent": all_time,
        "topExpense": top
    }

@app.post("/expenses/categorize", response_model=schemas.CategorizeResponse)
async def categorize_expense(req: schemas.CategorizeRequest):
    # Logic to categorize based on description, can use OpenAI or simple keywords
    desc = req.description.lower()
    if any(k in desc for k in ["uber", "taxi", "cabify"]): return {"category": "Transporte"}
    if any(k in desc for k in ["restaurante", "food", "comida", "pizza", "burger"]): return {"category": "Comida"}
    if any(k in desc for k in ["super", "mercado", "compras"]): return {"category": "Supermercado"}
    if any(k in desc for k in ["rent", "alquiler", "hogar"]): return {"category": "Hogar"}
    return {"category": "Otros"}

@app.post("/expenses/parse")
async def parse_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    contents = await file.read()
    # Fetch available categories to pass to OCR
    categories = [c.name for c in db.query(models.Category).all()]
    extracted_data = await ocr.process_receipt(contents, categories=categories)
    
    if not extracted_data:
        raise HTTPException(status_code=400, detail="Could not process receipt with AI")
    return extracted_data

@app.post("/expenses/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    contents = await file.read()
    # Fetch available categories to pass to OCR
    categories = [c.name for c in db.query(models.Category).all()]
    extracted_data = await ocr.process_receipt(contents, categories=categories)
    
    if not extracted_data:
        raise HTTPException(status_code=400, detail="Could not process receipt with AI")
    
    # Resolve Category ID (optional: auto-create if missing)
    category_name = extracted_data.get("category", "Otros")
    category = db.query(models.Category).filter(models.Category.name == category_name).first()
    if not category:
        category = models.Category(name=category_name)
        db.add(category)
        db.commit()
        db.refresh(category)
    
    # Process date
    try:
        expense_date = datetime.strptime(extracted_data.get("date"), "%Y-%m-%d")
    except:
        expense_date = func.now()

    db_expense = models.Expense(
        amount=extracted_data.get("amount", 0.0),
        tax_amount=extracted_data.get("tax_amount", 0.0),
        description=extracted_data.get("description", "Recibo escaneado"),
        date=expense_date,
        user_uid=current_user["uid"],
        category_id=category.id,
        ocr_text=str(extracted_data)
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    return db_expense

# Budgets Endpoints
@app.get("/budgets/", response_model=List[schemas.Budget])
def read_budgets(db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    return db.query(models.Budget).filter(models.Budget.user_uid == current_user["uid"]).all()

@app.post("/budgets/", response_model=schemas.Budget)
def create_budget(budget: schemas.BudgetCreate, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    # Check if budget for this category, month, year already exists
    existing_budget = db.query(models.Budget).filter(
        models.Budget.user_uid == current_user["uid"],
        models.Budget.category_id == budget.category_id,
        models.Budget.month == budget.month,
        models.Budget.year == budget.year
    ).first()
    
    if existing_budget:
        existing_budget.amount = budget.amount
        db.commit()
        db.refresh(existing_budget)
        return existing_budget
    
    db_budget = models.Budget(**budget.model_dump(), user_uid=current_user["uid"])
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)
    return db_budget

@app.delete("/budgets/{budget_id}")
def delete_budget(budget_id: str, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    db_budget = db.query(models.Budget).filter(
        models.Budget.id == budget_id,
        models.Budget.user_uid == current_user["uid"]
    ).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    db.delete(db_budget)
    db.commit()
    return {"message": "Budget deleted"}

@app.get("/budgets/intelligence")
def get_budget_intelligence(db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    # Fetch last 6 months of expenses
    now = datetime.now()
    six_months_ago = now.replace(month=now.month-6) if now.month > 6 else now.replace(year=now.year-1, month=now.month+6)
    
    expenses = db.query(models.Expense).filter(
        models.Expense.user_uid == current_user["uid"],
        models.Expense.date >= six_months_ago
    ).all()
    
    # Analyze by category
    analysis = {}
    for exp in expenses:
        cat_name = exp.category.name if exp.category else "Varios"
        if cat_name not in analysis:
            analysis[cat_name] = {"months": {}, "total": 0, "count": 0}
        
        m_key = f"{exp.date.year}-{exp.date.month}"
        analysis[cat_name]["months"][m_key] = analysis[cat_name]["months"].get(m_key, 0) + exp.amount
        analysis[cat_name]["total"] += exp.amount
        analysis[cat_name]["count"] += 1

    result = []
    for cat, data in analysis.items():
        month_totals = list(data["months"].values())
        avg = sum(month_totals) / len(month_totals) if month_totals else 0
        
        # Trend (last month vs average)
        last_month_key = f"{now.year}-{now.month-1}" if now.month > 1 else f"{now.year-1}-12"
        last_month_total = data["months"].get(last_month_key, 0)
        
        trend_pct = ((last_month_total - avg) / avg * 100) if avg > 0 else 0
        
        result.append({
            "category": cat,
            "average_monthly": round(avg, 2),
            "last_month_total": round(last_month_total, 2),
            "suggested_budget": round(avg * 1.1, 2), # Avg + 10% margin
            "trend_pct": round(trend_pct, 1),
            "count": data["count"]
        })
    
    return result

def get_filtered_expenses_query(
    db: Session,
    user_uid: str,
    category_id: Optional[str] = None,
    vendor: Optional[str] = None,
    receipt_number: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    due_start_date: Optional[datetime] = None,
    due_end_date: Optional[datetime] = None,
    payment_method: Optional[str] = None,
    status: Optional[str] = None,
    description: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None
):
    print(f"DEBUG FILTER: User={user_uid}, Cat={category_id}, Vendor={vendor}, Start={start_date}")
    query = db.query(models.Expense).filter(models.Expense.user_uid == user_uid)
    if category_id and category_id.strip():
        print(f"DEBUG: Applying category filter: '{category_id}'")
        query = query.filter(models.Expense.category_id == category_id)
    if vendor and vendor.strip():
        print(f"DEBUG: Applying vendor filter: {vendor}")
        query = query.filter(
            (models.Expense.vendor.ilike(f"%{vendor}%")) | 
            (models.Expense.description.ilike(f"%{vendor}%"))
        )
    if receipt_number:
        query = query.filter(models.Expense.receipt_number.ilike(f"%{receipt_number}%"))
    if description:
        query = query.filter(models.Expense.description.ilike(f"%{description}%"))
    if start_date:
        query = query.filter(models.Expense.date >= start_date)
    if end_date:
        query = query.filter(models.Expense.date <= end_date)
    if due_start_date:
        query = query.filter(models.Expense.due_date >= due_start_date)
    if due_end_date:
        query = query.filter(models.Expense.due_date <= due_end_date)
    if payment_method:
        query = query.filter(models.Expense.payment_method.ilike(f"%{payment_method}%"))
    if status:
        query = query.filter(models.Expense.status == status)
    if min_amount is not None:
        query = query.filter(models.Expense.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(models.Expense.amount <= max_amount)
    
    return query

# End of expenses list logic

@app.get("/expenses/export")
def export_expenses(
    format: str = "csv",
    category_id: Optional[str] = None,
    vendor: Optional[str] = None,
    receipt_number: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    due_start_date: Optional[datetime] = None,
    due_end_date: Optional[datetime] = None,
    payment_method: Optional[str] = None,
    status: Optional[str] = None,
    description: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    db: Session = Depends(get_db), 
    current_user: dict = Depends(auth.get_current_user)
):
    import pandas as pd
    query = get_filtered_expenses_query(
        db, current_user["uid"], category_id, vendor, receipt_number, 
        start_date, end_date, due_start_date, due_end_date,
        payment_method, status, description, min_amount, max_amount
    )
    expenses = query.all()
    
    # Pre-fetch categories for mapping
    categories = {c.id: c.name for c in db.query(models.Category).all()}
    
    data = []
    for e in expenses:
        data.append({
            "FechaEmision": e.date.strftime("%Y-%m-%d") if e.date else "",
            "FechaVencimiento": e.due_date.strftime("%Y-%m-%d") if e.due_date else "",
            "Comprobante": e.receipt_number or "",
            "Proveedor": e.vendor or "",
            "Descripcion": e.description or "",
            "MontoNeto": e.net_amount or 0,
            "IVA": e.tax_amount or 0,
            "OtrosImpuestos": e.other_taxes or 0,
            "MontoTotal": e.amount or 0,
            "FormaPago": e.payment_method or "",
            "Estado": e.status or "",
            "Categoria": categories.get(e.category_id, "Desconocida")
        })
    
    df = pd.DataFrame(data)
    filename = f"export_facturaciones_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    if format == "xlsx":
        buffer = io.BytesIO()
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Gastos')
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}.xlsx"}
        )
    elif format == "txt":
        # Semicolon delimited (matches our import format)
        txt_content = df.to_csv(sep=';', index=False, lineterminator='\n')
        return StreamingResponse(
            iter([txt_content]),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={filename}.txt"}
        )
    else: # Default CSV
        csv_content = df.to_csv(index=False, lineterminator='\n')
        return StreamingResponse(
            iter([csv_content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
        )

@app.post("/expenses/import")
async def import_expenses(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(auth.get_current_user)
):
    import pandas as pd
    contents = await file.read()
    filename = file.filename.lower()
    
    try:
        if filename.endswith(('.csv', '.txt')):
            # Try comma, then semicolon, then tab
            content_decoded = contents.decode('utf-8')
            for sep in [',', ';', '\t']:
                try:
                    df = pd.read_csv(io.StringIO(content_decoded), sep=sep)
                    if len(df.columns) > 1:
                        break
                except:
                    continue
        else:
            df = pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # Column mapping (detailed & flexible)
    col_map = {
        "FechaEmision": "date",
        "FechaVencimiento": "due_date",
        "Comprobante": "receipt_number",
        "Proveedor": "vendor",
        "Descripcion": "description",
        "Descripción": "description",
        "MontoNeto": "net_amount",
        "IVA": "tax_amount",
        "OtrosImpuestos": "other_taxes",
        "MontoTotal": "amount",
        "Importe": "amount",
        "FormaPago": "payment_method",
        "Estado": "status",
        "Categoria": "category",
        "Categoría": "category"
    }
    
    # Rename columns based on map if they exist
    df = df.rename(columns={c: col_map[c] for c in df.columns if c in col_map})
    
    required_cols = ["description", "amount"]
    for col in required_cols:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Missing required column: {col}")

    # Process categories
    categories = db.query(models.Category).all()
    cat_map = {c.name.lower(): c.id for c in categories}
    default_cat = categories[0].id if categories else None

    def parse_float(val):
        if pd.isna(val) or val == "":
            return 0.0
        if isinstance(val, (int, float)):
            return float(val)
        # Handle string with comma as decimal separator
        str_val = str(val).replace(',', '.')
        try:
            return float(str_val)
        except:
            return 0.0

    expenses_to_add = []
    errors = []
    for index, row in df.iterrows():
        try:
            cat_name = str(row.get("category", "")).lower().strip()
            cat_id = cat_map.get(cat_name, default_cat)
            
            # Parse date
            try:
                exp_date = pd.to_datetime(row.get("date", datetime.now())).to_pydatetime()
            except:
                exp_date = datetime.now()

            db_expense = models.Expense(
                amount=parse_float(row.get("amount", 0)),
                tax_amount=parse_float(row.get("tax_amount", 0)),
                net_amount=parse_float(row.get("net_amount", 0)),
                other_taxes=parse_float(row.get("other_taxes", 0)),
                vendor=str(row.get("vendor", "")).strip() if pd.notna(row.get("vendor")) else None,
                receipt_number=str(row.get("receipt_number", "")).strip() if pd.notna(row.get("receipt_number")) else None,
                payment_method=str(row.get("payment_method", "")).strip() if pd.notna(row.get("payment_method")) else None,
                status=str(row.get("status", "Pagado")).strip() if pd.notna(row.get("status")) else "Pagado",
                description=str(row.get("description", "Importado")),
                date=exp_date,
                due_date=pd.to_datetime(row.get("due_date")).to_pydatetime() if pd.notna(row.get("due_date")) else None,
                user_uid=current_user["uid"],
                category_id=cat_id
            )
            expenses_to_add.append(db_expense)
        except Exception as row_err:
            errors.append(f"Error en fila {index + 2}: {str(row_err)}")

    if errors and len(expenses_to_add) == 0:
        raise HTTPException(status_code=400, detail="; ".join(errors[:3]))

    db.add_all(expenses_to_add)
    db.commit()
    return {
        "message": f"Se importaron {len(expenses_to_add)} facturaciones correctamente.",
        "errors": errors if errors else None
    }

@app.get("/categories/", response_model=List[schemas.Category])
def read_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).all()

@app.post("/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_category = models.Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.put("/categories/{category_id}", response_model=schemas.Category)
def update_category(category_id: str, category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, value in category.model_dump().items():
        setattr(db_category, key, value)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.delete("/categories/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db)):
    db_category = db.query(models.Category).filter(models.Category.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(db_category)
    db.commit()
    return {"message": "Category deleted"}

@app.get("/currency/latest")
async def get_currency_rates():
    current_time = time.time()
    if currency_cache["data"] and (current_time - currency_cache["last_fetched"] < CACHE_TTL):
        return currency_cache["data"]
    
    try:
        async with httpx.AsyncClient() as client:
            # Fetch International Rates
            intl_res = await client.get("https://open.er-api.com/v6/latest/USD")
            intl_data = intl_res.json() if intl_res.status_code == 200 else {}
            
            # Fetch Argentine Rates (Dólar API is more comprehensive)
            arg_res = await client.get("https://dolarapi.com/v1/dolares")
            arg_raw = arg_res.json() if arg_res.status_code == 200 else []
            
            # Transform list of objects to dict for easy frontend access
            arg_data = {}
            for item in arg_raw:
                # Map casa name to key
                key = item.get("casa")
                # Maintain compatibility with frontend keys if needed
                if key == "bolsa": key = "mep"
                if key == "contadoconliqui": key = "ccl"
                
                arg_data[key] = {
                    "value_avg": (item.get("compra", 0) + item.get("venta", 0)) / 2,
                    "compra": item.get("compra"),
                    "venta": item.get("venta"),
                    "last_update": item.get("fechaActualizacion")
                }
            
            # Merge data
            merged_data = {
                **intl_data,
                "argentine": arg_data,
                "fetched_at": datetime.now().isoformat()
            }
            
            currency_cache["data"] = merged_data
            currency_cache["last_fetched"] = current_time
            return merged_data
            
    except Exception as e:
        print(f"Currency API Error: {e}")
        if currency_cache["data"]:
            return currency_cache["data"]
        raise HTTPException(status_code=500, detail="Could not fetch currency rates")
