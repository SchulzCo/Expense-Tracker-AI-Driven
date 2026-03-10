from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL)

def count_rows():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT count(*) FROM categories"))
        count = res.scalar()
        print(f"Categories count: {count}")
        
if __name__ == "__main__":
    count_rows()
