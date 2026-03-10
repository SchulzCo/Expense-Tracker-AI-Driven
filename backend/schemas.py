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
    description: str
    date: datetime = datetime.now()
    receipt_url: Optional[str] = None
    ocr_text: Optional[str] = None
    category_id: str

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: str
    user_uid: str
    created_at: datetime

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
    count: int
    byCategory: List[dict]
    dailyTotals: List[dict]
    weeklyTotals: List[dict]
    alerts: List[dict]
    recentExpenses: List[Expense]
    allTimeRecent: List[Expense]
    topExpense: Optional[dict] = None
