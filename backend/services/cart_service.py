"""Cart & order computation helpers."""
from models.cart import CartItem


def cart_summary(user_id):
    """Compute subtotal, discount (from product discounts), shipping and total."""
    items = CartItem.query.filter_by(user_id=user_id).all()
    subtotal = round(sum(i.subtotal() for i in items), 2)

    # Discount from product-level price differences
    discount = round(
        sum((i.product.price - i.unit_price()) * i.quantity for i in items), 2
    )
    discount = max(discount, 0)

    # Free shipping above threshold
    FREE_SHIPPING_ABOVE = 999
    shipping = 0.0 if subtotal >= FREE_SHIPPING_ABOVE else 49.0
    total = round(subtotal + shipping, 2)

    return {
        "items": [i.to_dict() for i in items],
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "total": total,
        "count": sum(i.quantity for i in items),
    }


def apply_coupon_to_summary(summary, coupon_code=None):
    """Apply a validated coupon and return updated summary."""
    if coupon_code:
        from services.coupon_service import validate_coupon

        coupon, discount_amount, error = validate_coupon(coupon_code, summary["subtotal"])
        if error:
            return summary, error
        summary["coupon_discount"] = discount_amount
        summary["coupon_code"] = coupon.code
        summary["total"] = round(
            summary["subtotal"] - discount_amount + summary["shipping"], 2
        )
        return summary, None
    summary["coupon_discount"] = 0
    summary["coupon_code"] = None
    return summary, None
