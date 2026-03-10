from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, text
import firebase_admin
from typing import List
from datetime import datetime
import io
import csv
import models, schemas, auth, database, ocr
from database import engine, get_db

from fastapi.middleware.cors import CORSMiddleware

# Initialize Firebase
auth.init_firebase()

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Expense Tracker API")

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
@app.get("/expenses/", response_model=List[schemas.Expense])
def read_expenses(db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    return db.query(models.Expense).filter(models.Expense.user_uid == current_user["uid"]).all()

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
    
    for cat_id, cat_total in cat_totals.items():
        cat = category_map.get(cat_id)
        if cat:
            by_category.append({
                "name": cat.name,
                "color": cat.color,
                "total": cat_total,
                "count": len([e for e in expenses if e.category_id == cat_id])
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
        "count": len(expenses),
        "byCategory": by_category,
        "dailyTotals": [], # Simplified for now
        "weeklyTotals": [], # Simplified for now
        "alerts": [], # Simplified for now
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

@app.get("/expenses/export")
def export_expenses(month: int, year: int, db: Session = Depends(get_db), current_user: dict = Depends(auth.get_current_user)):
    expenses = db.query(models.Expense).filter(
        models.Expense.user_uid == current_user["uid"],
        func.extract('month', models.Expense.date) == month,
        func.extract('year', models.Expense.date) == year
    ).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Fecha", "Descripcion", "Monto", "Categoria"])
    
    categories = db.query(models.Category).all()
    cat_map = {c.id: c.name for c in categories}
    
    for e in expenses:
        writer.writerow([e.id, e.date, e.description, e.amount, cat_map.get(e.category_id, "Unknown")])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=gastos_{year}_{month}.csv"}
    )

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
