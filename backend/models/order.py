"""Order and OrderItem models."""
from datetime import datetime

from database.db import db

# Order status lifecycle
ORDER_STATUSES = [
    "Order Placed",
    "Confirmed",
    "Packed",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
]

PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"]


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(30), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    subtotal = db.Column(db.Float, default=0.0)
    discount = db.Column(db.Float, default=0.0)
    shipping = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, default=0.0)
    coupon_code = db.Column(db.String(50))
    payment_method = db.Column(db.String(50), default="COD")
    payment_status = db.Column(db.String(20), default="Pending")
    order_status = db.Column(db.String(30), default="Order Placed")
    shipping_address = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship(
        "OrderItem", backref="order", lazy="select", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "order_id": self.order_id,
            "user_id": self.user_id,
            "subtotal": self.subtotal,
            "discount": self.discount,
            "shipping": self.shipping,
            "total": self.total,
            "coupon_code": self.coupon_code,
            "payment_method": self.payment_method,
            "payment_status": self.payment_status,
            "order_status": self.order_status,
            "shipping_address": self.shipping_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "items": [i.to_dict() for i in self.items],
        }


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"))
    name = db.Column(db.String(200), nullable=False)
    image = db.Column(db.String(500))
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, default=1)
    size = db.Column(db.String(20))
    color = db.Column(db.String(50))

    product = db.relationship("Product")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "name": self.name,
            "image": self.image,
            "price": self.price,
            "quantity": self.quantity,
            "size": self.size,
            "color": self.color,
            "total": round(self.price * self.quantity, 2),
        }
