"""Wishlist routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.db import db
from models.cart import CartItem, WishlistItem
from models.product import Product

wishlist_bp = Blueprint("wishlist", __name__)


def _user_id():
    return get_jwt_identity().get("id")


@wishlist_bp.route("/api/wishlist", methods=["GET"])
@jwt_required()
def get_wishlist():
    items = WishlistItem.query.filter_by(user_id=_user_id()).all()
    return jsonify({"items": [i.to_dict() for i in items], "count": len(items)}), 200


@wishlist_bp.route("/api/wishlist/items", methods=["POST"])
@jwt_required()
def add_to_wishlist():
    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"message": "Product not found."}), 404
    existing = WishlistItem.query.filter_by(user_id=_user_id(), product_id=product_id).first()
    if existing:
        return jsonify({"message": "Already in wishlist."}), 200
    db.session.add(WishlistItem(user_id=_user_id(), product_id=product_id))
    db.session.commit()
    count = WishlistItem.query.filter_by(user_id=_user_id()).count()
    return jsonify({"message": "Added to wishlist.", "count": count}), 201


@wishlist_bp.route("/api/wishlist/items/<int:item_id>", methods=["DELETE"])
@jwt_required()
def remove_from_wishlist(item_id):
    item = WishlistItem.query.filter_by(id=item_id, user_id=_user_id()).first()
    if not item:
        return jsonify({"message": "Wishlist item not found."}), 404
    db.session.delete(item)
    db.session.commit()
    count = WishlistItem.query.filter_by(user_id=_user_id()).count()
    return jsonify({"message": "Removed from wishlist.", "count": count}), 200


@wishlist_bp.route("/api/wishlist/items/<int:item_id>/move-to-cart", methods=["POST"])
@jwt_required()
def move_to_cart(item_id):
    item = WishlistItem.query.filter_by(id=item_id, user_id=_user_id()).first()
    if not item:
        return jsonify({"message": "Wishlist item not found."}), 404
    product = item.product
    if product.stock <= 0:
        return jsonify({"message": "Product is out of stock."}), 400
    cart_item = CartItem.query.filter_by(user_id=_user_id(), product_id=product.id).first()
    if cart_item:
        cart_item.quantity += 1
    else:
        db.session.add(CartItem(user_id=_user_id(), product_id=product.id, quantity=1))
    db.session.delete(item)
    db.session.commit()
    count = WishlistItem.query.filter_by(user_id=_user_id()).count()
    return jsonify({"message": "Moved to cart.", "count": count}), 200
