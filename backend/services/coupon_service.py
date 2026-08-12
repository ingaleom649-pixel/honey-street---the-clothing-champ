"""Coupon validation logic."""
from datetime import datetime

from models.coupon import Coupon


def validate_coupon(code, cart_subtotal):
    """Return (coupon, discount_amount, error_message)."""
    coupon = Coupon.query.filter_by(code=code.strip().upper()).first()
    if not coupon:
        return None, 0, "Invalid coupon code."
    if not coupon.is_active:
        return None, 0, "This coupon is no longer active."
    if coupon.expires_at and coupon.expires_at < datetime.utcnow():
        return None, 0, "This coupon has expired."
    if cart_subtotal < coupon.min_order_amount:
        return (
            None,
            0,
            f"Minimum order amount for this coupon is ₹{int(coupon.min_order_amount)}.",
        )

    if coupon.discount_type == "percent":
        discount = cart_subtotal * coupon.discount_value / 100.0
        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
    else:
        discount = coupon.discount_value

    discount = min(discount, cart_subtotal)
    return coupon, round(discount, 2), None
