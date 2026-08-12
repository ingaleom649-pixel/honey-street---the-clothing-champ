"""Category, Product, ProductImage and Review models."""
from datetime import datetime

from sqlalchemy import func

from database.db import db


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    slug = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.String(255))
    image = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    products = db.relationship("Product", backref="category", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "image": self.image,
        }


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(220), unique=True, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"))
    brand = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    discount_price = db.Column(db.Float)
    stock = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=0.0)
    rating_count = db.Column(db.Integer, default=0)
    sizes = db.Column(db.String(255), default="S,M,L,XL")  # comma separated
    colors = db.Column(db.String(255), default="Black,White")  # comma separated
    is_trending = db.Column(db.Boolean, default=False)
    is_new = db.Column(db.Boolean, default=True)
    is_featured = db.Column(db.Boolean, default=False)
    popularity = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    images = db.relationship(
        "ProductImage", backref="product", lazy="select", cascade="all, delete-orphan"
    )
    reviews = db.relationship(
        "Review", backref="product", lazy="dynamic", cascade="all, delete-orphan"
    )

    def main_image(self):
        if self.images:
            return self.images[0].url
        return ""

    def all_images(self):
        return [img.url for img in self.images] or []

    def to_dict(self, include_category=True):
        data = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "category_id": self.category_id,
            "category": self.category.name if self.category else None,
            "brand": self.brand,
            "description": self.description,
            "price": self.price,
            "discount_price": self.discount_price,
            "discount_percent": self.discount_percent(),
            "stock": self.stock,
            "rating": round(self.rating, 1),
            "rating_count": self.rating_count,
            "sizes": self.sizes.split(",") if self.sizes else [],
            "colors": self.colors.split(",") if self.colors else [],
            "is_trending": self.is_trending,
            "is_new": self.is_new,
            "is_featured": self.is_featured,
            "image": self.main_image(),
            "images": self.all_images(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        return data

    def discount_percent(self):
        if self.discount_price and self.price:
            return int(round((1 - self.discount_price / self.price) * 100))
        return 0

    def __repr__(self):
        return f"<Product {self.name}>"


class ProductImage(db.Model):
    __tablename__ = "product_images"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    alt = db.Column(db.String(255))
    position = db.Column(db.Integer, default=0)


class Review(db.Model):
    __tablename__ = "reviews"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    title = db.Column(db.String(200))
    comment = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "user_name": self.user.full_name if self.user else "Anonymous",
            "rating": self.rating,
            "title": self.title,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
