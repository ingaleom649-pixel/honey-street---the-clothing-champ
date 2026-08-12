"""User profile routes: view/edit profile, change password, addresses."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.db import db
from models.user import Address, User
from utils.validators import validate_email, validate_password, validate_phone

profile_bp = Blueprint("profile", __name__)


def _uid():
    return get_jwt_identity().get("id")


@profile_bp.route("/api/profile", methods=["GET"])
@jwt_required()
def get_profile():
    user = User.query.get(_uid())
    if not user:
        return jsonify({"message": "User not found."}), 404
    return jsonify({
        "user": user.to_dict(),
        "addresses": [a.to_dict() for a in user.addresses],
    }), 200


@profile_bp.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    data = request.get_json(silent=True) or {}
    user = User.query.get(_uid())
    if not user:
        return jsonify({"message": "User not found."}), 404

    if "full_name" in data and data["full_name"].strip():
        user.full_name = data["full_name"].strip()
    if "phone" in data:
        if data["phone"] and not validate_phone(data["phone"]):
            return jsonify({"message": "Invalid phone number."}), 400
        user.phone = (data["phone"] or "").strip()
    if "email" in data and data["email"].strip():
        if not validate_email(data["email"]):
            return jsonify({"message": "Invalid email."}), 400
        email = data["email"].strip().lower()
        if User.query.filter(User.email == email, User.id != user.id).first():
            return jsonify({"message": "Email already in use."}), 409
        user.email = email
    db.session.commit()
    return jsonify({"message": "Profile updated.", "user": user.to_dict()}), 200


@profile_bp.route("/api/profile/password", methods=["PUT"])
@jwt_required()
def change_password():
    data = request.get_json(silent=True) or {}
    user = User.query.get(_uid())
    if not user:
        return jsonify({"message": "User not found."}), 404
    current = data.get("current_password", "")
    new_password = data.get("new_password", "")
    if not user.check_password(current):
        return jsonify({"message": "Current password is incorrect."}), 400
    if not validate_password(new_password):
        return jsonify({"message": "New password must be at least 8 characters with a letter and number."}), 400
    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password changed successfully."}), 200


# ---- Addresses ----

@profile_bp.route("/api/addresses", methods=["GET"])
@jwt_required()
def list_addresses():
    addresses = Address.query.filter_by(user_id=_uid()).all()
    return jsonify({"addresses": [a.to_dict() for a in addresses]}), 200


@profile_bp.route("/api/addresses", methods=["POST"])
@jwt_required()
def add_address():
    data = request.get_json(silent=True) or {}
    required = ["full_name", "phone", "line1", "city", "state", "postal_code"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"message": "Missing fields: " + ", ".join(missing)}), 400
    addr = Address(user_id=_uid(), **{k: data.get(k) for k in required})
    addr.country = data.get("country", "India")
    addr.line2 = data.get("line2", "")
    if data.get("is_default"):
        Address.query.filter_by(user_id=_uid()).update({"is_default": False})
        addr.is_default = True
    db.session.add(addr)
    db.session.commit()
    return jsonify({"message": "Address added.", "address": addr.to_dict()}), 201


@profile_bp.route("/api/addresses/<int:addr_id>", methods=["PUT"])
@jwt_required()
def update_address(addr_id):
    addr = Address.query.filter_by(id=addr_id, user_id=_uid()).first()
    if not addr:
        return jsonify({"message": "Address not found."}), 404
    data = request.get_json(silent=True) or {}
    for field in ["full_name", "phone", "line1", "line2", "city", "state", "postal_code", "country"]:
        if field in data:
            setattr(addr, field, data[field])
    if data.get("is_default"):
        Address.query.filter_by(user_id=_uid()).update({"is_default": False})
        addr.is_default = True
    db.session.commit()
    return jsonify({"message": "Address updated.", "address": addr.to_dict()}), 200


@profile_bp.route("/api/addresses/<int:addr_id>", methods=["DELETE"])
@jwt_required()
def delete_address(addr_id):
    addr = Address.query.filter_by(id=addr_id, user_id=_uid()).first()
    if not addr:
        return jsonify({"message": "Address not found."}), 404
    db.session.delete(addr)
    db.session.commit()
    return jsonify({"message": "Address deleted."}), 200
