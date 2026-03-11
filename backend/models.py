from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    firebase_uid = Column(String(128), primary_key=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    expenses = relationship("Expense", back_populates="user")
    budgets = relationship("Budget", back_populates="user")

class Category(Base):
    __tablename__ = "categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, index=True, nullable=False)
    icon = Column(String(50), default="tag")
    color = Column(String(20), default="#6366f1")

    expenses = relationship("Expense", back_populates="category")
    budgets = relationship("Budget", back_populates="category")

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    amount = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    net_amount = Column(Float, default=0.0)
    other_taxes = Column(Float, default=0.0)
    vendor = Column(String(255), nullable=True)
    receipt_number = Column(String(100), nullable=True)
    payment_method = Column(String(50), nullable=True)
    status = Column(String(50), default="Pagado")
    description = Column(String(500), nullable=False)
    date = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=True)
    receipt_url = Column(String(1024), nullable=True)
    ocr_text = Column(String(4096), nullable=True)
    user_uid = Column(String(128), ForeignKey("users.firebase_uid"), nullable=False)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    amount = Column(Float, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    user_uid = Column(String(128), ForeignKey("users.firebase_uid"), nullable=False)
    category_id = Column(String(36), ForeignKey("categories.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

    __table_args__ = (UniqueConstraint('user_uid', 'category_id', 'month', 'year', name='_user_category_month_year_uc'),)
