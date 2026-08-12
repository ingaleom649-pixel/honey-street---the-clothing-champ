"""Review routes."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.db import db
from models.product import Product, Review

reviews_bp = Blueprint("reviews", __name__)


@reviews_bp.route("/api/products/<int:pid>/reviews", methods=["GET"])
def get_reviews(pid):
    product = Product.query.get(pid)
    if not product:
        return jsonify({"message": "Product not found."}), 404
    reviews = Review.query.filter_by(product_id=pid).order_by(Review.created_at.desc()).all()
    return jsonify({"reviews": [r.to_dict() for r in reviews]}), 200


@reviews_bp.route("/api/products/<int:pid>/reviews", methods=["POST"])
@jwt_required()
def add_review(pid):
    data = request.get_json(silent=True) or {}
    rating = data.get("rating")
    title = (data.get("title") or "").strip()
    comment = (data.get("comment") or "").strip()

    product = Product.query.get(pid)
    if not product:
        return jsonify({"message": "Product not found."}), 404
    if not rating or int(rating) < 1 or int(rating) > 5:
        return jsonify({"message": "Rating must be between 1 and 5."}), 400
    if not comment:
        return jsonify({"message": "Review comment is required."}), 400

    uid = get_jwt_identity().get("id")
    review = Review(product_id=pid, user_id=uid, rating=int(rating), title=title, comment=comment)
    db.session.add(review)
    db.session.commit()

    # Recompute average rating
    from sqlalchemy import func
    avg = db.session.query(func.avg(Review.rating)).filter(Review.product_id == pid).scalar()
    count = Review.query.filter_by(product_id=pid).count()
    product.rating = round(avg or 0, 1)
    product.rating_count = count
    db.session.commit()

    return jsonify({"message": "Review submitted.", "review": review.to_dict()}), 201
