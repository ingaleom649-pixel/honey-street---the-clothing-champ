"""Seed runner: creates the database and inserts demo data.

Usage:
    cd backend
    python seed.py
"""
from app import create_app
from database.db import db
from utils.seed import seed_all

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
        seeded = seed_all()
        if seeded:
            print("✅ Database seeded with demo categories, products, coupons and users.")
        else:
            print("ℹ️ Database already contains data. Nothing to seed.")
    print("Done.")
