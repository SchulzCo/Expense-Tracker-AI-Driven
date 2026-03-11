from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    icon: str = "tag"
    color: str = "#6366f1"

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: str

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    firebase_uid: str
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    amount: float
    tax_amount: Optional[float] = 0.0
    net_amount: Optional[float] = 0.0
    other_taxes: Optional[float] = 0.0
    vendor: Optional[str] = None
    receipt_number: Optional[str] = None
    payment_method: Optional[str] = None
    status: Optional[str] = "Pagado"
    description: str
    date: datetime = datetime.now()
    due_date: Optional[datetime] = None
    receipt_url: Optional[str] = None
    ocr_text: Optional[str] = None
    category_id: str

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: str
    user_uid: str
    created_at: datetime
    category: Optional[Category] = None

    class Config:
        from_attributes = True

class BudgetBase(BaseModel):
    amount: float
    month: int
    year: int
    category_id: str

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    id: str
    user_uid: str
    created_at: datetime
    category: Optional[Category] = None

    class Config:
        from_attributes = True

class CategorizeRequest(BaseModel):
    description: str
    amount: Optional[float] = None

class CategorizeResponse(BaseModel):
    category: str

class ExpenseStats(BaseModel):
    total: float
    prevTotal: float
    totalBudget: float = 0.0
    count: int
    byCategory: List[dict]
    dailyTotals: List[dict]
    weeklyTotals: List[dict]
    alerts: List[dict]
    recentExpenses: List[Expense]
    allTimeRecent: List[Expense]
    topExpense: Optional[dict] = None

class CurrencyRates(BaseModel):
    base_code: str
    rates: dict
    time_last_update_utc: str
    time_next_update_utc: str
class BatchDeleteRequest(BaseModel):
    ids: List[str]
