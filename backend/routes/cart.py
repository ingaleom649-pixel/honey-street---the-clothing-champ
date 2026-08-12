"""Cart routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.db import db
from models.cart import CartItem
from models.product import Product
from services.cart_service import apply_coupon_to_summary, cart_summary

cart_bp = Blueprint("cart", __name__)


def _user_id():
    return get_jwt_identity().get("id")


@cart_bp.route("/api/cart", methods=["GET"])
@jwt_required()
def get_cart():
    summary = cart_summary(_user_id())
    summary, _ = apply_coupon_to_summary(summary)
    return jsonify(summary), 200


@cart_bp.route("/api/cart/items", methods=["POST"])
@jwt_required()
def add_to_cart():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    quantity = data.get("quantity", 1)
    size = data.get("size")
    color = data.get("color")

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"message": "Product not found."}), 404
    if product.stock < quantity:
        return jsonify({"message": "Insufficient stock."}), 400

    existing = CartItem.query.filter_by(
        user_id=_user_id(), product_id=product_id, size=size, color=color
    ).first()
    if existing:
        new_qty = existing.quantity + quantity
        if new_qty > max(product.stock, 0) and product.stock > 0:
            return jsonify({"message": "Insufficient stock."}), 400
        existing.quantity = new_qty
    else:
        db.session.add(CartItem(
            user_id=_user_id(), product_id=product_id,
            quantity=quantity, size=size, color=color,
        ))
    db.session.commit()
    summary = cart_summary(_user_id())
    summary, _ = apply_coupon_to_summary(summary)
    return jsonify({"message": "Added to cart.", "cart": summary}), 201


@cart_bp.route("/api/cart/items/<int:item_id>", methods=["PATCH"])
@jwt_required()
def update_cart_item(item_id):
    data = request.get_json(silent=True) or {}
    item = CartItem.query.filter_by(id=item_id, user_id=_user_id()).first()
    if not item:
        return jsonify({"message": "Cart item not found."}), 404
    quantity = data.get("quantity")
    if quantity is not None:
        if quantity < 1:
            return jsonify({"message": "Quantity must be at least 1."}), 400
        if item.product.stock > 0 and quantity > item.product.stock:
            return jsonify({"message": "Insufficient stock."}), 400
        item.quantity = quantity
    if data.get("size"):
        item.size = data["size"]
    if data.get("color"):
        item.color = data["color"]
    db.session.commit()
    summary = cart_summary(_user_id())
    summary, _ = apply_coupon_to_summary(summary)
    return jsonify({"message": "Cart updated.", "cart": summary}), 200


@cart_bp.route("/api/cart/items/<int:item_id>", methods=["DELETE"])
@jwt_required()
def remove_cart_item(item_id):
    item = CartItem.query.filter_by(id=item_id, user_id=_user_id()).first()
    if not item:
        return jsonify({"message": "Cart item not found."}), 404
    db.session.delete(item)
    db.session.commit()
    summary = cart_summary(_user_id())
    summary, _ = apply_coupon_to_summary(summary)
    return jsonify({"message": "Removed from cart.", "cart": summary}), 200


@cart_bp.route("/api/cart/clear", methods=["DELETE"])
@jwt_required()
def clear_cart():
    CartItem.query.filter_by(user_id=_user_id()).delete()
    db.session.commit()
    return jsonify({"message": "Cart cleared.", "cart": cart_summary(_user_id())}), 200


@cart_bp.route("/api/cart/apply-coupon", methods=["POST"])
@jwt_required()
def apply_coupon():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    summary = cart_summary(_user_id())
    summary, error = apply_coupon_to_summary(summary, code)
    if error:
        return jsonify({"message": error}), 400
    return jsonify({"message": "Coupon applied.", "cart": summary}), 200


@cart_bp.route("/api/cart/remove-coupon", methods=["POST"])
@jwt_required()
def remove_coupon():
    summary = cart_summary(_user_id())
    summary, _ = apply_coupon_to_summary(summary)
    return jsonify({"message": "Coupon removed.", "cart": summary}), 200
