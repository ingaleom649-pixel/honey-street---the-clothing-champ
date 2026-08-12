"""SQLAlchemy database instance and initializer."""
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def init_db(app):
    """Initialize the SQLAlchemy extension and create all tables."""
    db.init_app(app)
    from models import (  # noqa: F401  (ensures models are registered)
        Address,
        CartItem,
        Category,
        Coupon,
        Order,
        OrderItem,
        Product,
        ProductImage,
        Review,
        User,
        WishlistItem,
    )

    with app.app_context():
        db.create_all()
    return db
