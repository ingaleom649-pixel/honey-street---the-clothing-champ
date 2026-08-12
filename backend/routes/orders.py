"""Order routes: create, list, detail, track, cancel."""
import secrets

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.db import db
from models.cart import CartItem
from models.order import Order, OrderItem
from models.product import Product
from services.cart_service import apply_coupon_to_summary, cart_summary

orders_bp = Blueprint("orders", __name__)

FREE_SHIPPING_ABOVE = 999
SHIPPING_FEE = 49.0


def _user_id():
    return get_jwt_identity().get("id")


def _generate_order_id():
    return "HS" + secrets.token_hex(4).upper()


@orders_bp.route("/api/orders", methods=["POST"])
@jwt_required()
def create_order():
    data = request.get_json(silent=True) or {}
    address = data.get("shipping_address")
    payment_method = data.get("payment_method", "COD")
    coupon_code = data.get("coupon_code")

    if not address or not address.get("line1"):
        return jsonify({"message": "Shipping address is required."}), 400

    summary = cart_summary(_user_id())
    if not summary["items"]:
        return jsonify({"message": "Your cart is empty."}), 400

    # Apply coupon if provided
    coupon_discount = 0
    if coupon_code:
        summary, error = apply_coupon_to_summary(summary, coupon_code)
        if error:
            return jsonify({"message": error}), 400
        coupon_discount = summary.get("coupon_discount", 0)

    # Validate stock
    for item in summary["items"]:
        product = Product.query.get(item["product_id"])
        if not product or product.stock < item["quantity"]:
            return jsonify({"message": f"Insufficient stock for {item['name']}."}), 400

    # Build address string
    addr = address
    addr_text = (
        f"{addr.get('full_name','')}, {addr.get('phone','')}\n"
        f"{addr.get('line1','')}"
        f"{', ' + addr.get('line2','') if addr.get('line2') else ''}\n"
        f"{addr.get('city','')}, {addr.get('state','')} - {addr.get('postal_code','')}\n"
        f"{addr.get('country','India')}"
    )

    order = Order(
        order_id=_generate_order_id(),
        user_id=_user_id(),
        subtotal=summary["subtotal"],
        discount=round(summary["discount"] + coupon_discount, 2),
        shipping=summary["shipping"],
        total=round(summary["subtotal"] - coupon_discount + summary["shipping"], 2),
        coupon_code=coupon_code,
        payment_method=payment_method,
        payment_status="Pending" if payment_method == "COD" else "Paid",
        order_status="Order Placed",
        shipping_address=addr_text,
    )
    db.session.add(order)
    db.session.flush()

    for item in summary["items"]:
        db.session.add(OrderItem(
            order_id=order.id,
            product_id=item["product_id"],
            name=item["name"],
            image=item["image"],
            price=item["unit_price"],
            quantity=item["quantity"],
            size=item.get("size"),
            color=item.get("color"),
        ))
        # Reduce stock
        product = Product.query.get(item["product_id"])
        product.stock = max(0, product.stock - item["quantity"])
        product.popularity = (product.popularity or 0) + item["quantity"]

    # Clear cart
    CartItem.query.filter_by(user_id=_user_id()).delete()
    db.session.commit()

    return jsonify({"message": "Order placed successfully.", "order": order.to_dict()}), 201


@orders_bp.route("/api/orders", methods=["GET"])
@jwt_required()
def list_orders():
    orders = Order.query.filter_by(user_id=_user_id()).order_by(Order.created_at.desc()).all()
    return jsonify({"orders": [o.to_dict() for o in orders]}), 200


@orders_bp.route("/api/orders/<order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id):
    order = Order.query.filter_by(order_id=order_id, user_id=_user_id()).first()
    if not order:
        return jsonify({"message": "Order not found."}), 404
    return jsonify({"order": order.to_dict()}), 200


@orders_bp.route("/api/orders/<order_id>/track", methods=["GET"])
@jwt_required()
def track_order(order_id):
    order = Order.query.filter_by(order_id=order_id, user_id=_user_id()).first()
    if not order:
        return jsonify({"message": "Order not found."}), 404
    from models.order import ORDER_STATUSES
    idx = ORDER_STATUSES.index(order.order_status) if order.order_status in ORDER_STATUSES else 0
    if order.order_status == "Cancelled":
        idx = len(ORDER_STATUSES) - 1
    return jsonify({
        "order_id": order.order_id,
        "order_status": order.order_status,
        "payment_status": order.payment_status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "status_list": ORDER_STATUSES,
        "current_index": idx,
        "total": order.total,
    }), 200


@orders_bp.route("/api/orders/<order_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_order(order_id):
    order = Order.query.filter_by(order_id=order_id, user_id=_user_id()).first()
    if not order:
        return jsonify({"message": "Order not found."}), 404
    if order.order_status in ("Delivered", "Cancelled", "Shipped"):
        return jsonify({"message": f"Order cannot be cancelled in '{order.order_status}' state."}), 400
    order.order_status = "Cancelled"
    order.payment_status = "Refunded" if order.payment_status == "Paid" else order.payment_status
    # Restore stock
    for item in order.items:
        if item.product_id:
            product = Product.query.get(item.product_id)
            if product:
                product.stock += item.quantity
    db.session.commit()
    return jsonify({"message": "Order cancelled.", "order": order.to_dict()}), 200
