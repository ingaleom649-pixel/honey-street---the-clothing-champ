"""Public coupon lookup routes."""
from flask import Blueprint, jsonify

from models.coupon import Coupon

coupons_bp = Blueprint("coupons", __name__)


@coupons_bp.route("/api/coupons", methods=["GET"])
def list_coupons():
    coupons = Coupon.query.filter_by(is_active=True).all()
    return jsonify({"coupons": [c.to_dict() for c in coupons]}), 200
