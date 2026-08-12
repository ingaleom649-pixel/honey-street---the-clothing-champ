"""Cart and Wishlist models."""
from datetime import datetime

from database.db import db


class CartItem(db.Model):
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    size = db.Column(db.String(20))
    color = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship("Product", backref="cart_items")

    def unit_price(self):
        return self.product.discount_price or self.product.price

    def subtotal(self):
        return self.unit_price() * self.quantity

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "name": self.product.name,
            "image": self.product.main_image(),
            "price": self.product.price,
            "discount_price": self.product.discount_price,
            "unit_price": self.unit_price(),
            "quantity": self.quantity,
            "size": self.size,
            "color": self.color,
            "subtotal": round(self.subtotal(), 2),
            "stock": self.product.stock,
        }


class WishlistItem(db.Model):
    __tablename__ = "wishlist_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship("Product", backref="wishlist_items")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "name": self.product.name,
            "image": self.product.main_image(),
            "price": self.product.price,
            "discount_price": self.product.discount_price,
            "rating": self.product.rating,
            "stock": self.product.stock,
        }
