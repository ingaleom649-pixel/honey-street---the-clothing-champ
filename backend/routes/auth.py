"""Authentication routes: register, login, logout, forgot password."""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from database.db import db
from models.user import User
from services.auth_service import issue_token, register_user
from utils.validators import validate_email, validate_password, validate_phone

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    confirm = data.get("confirm_password", "")

    if not full_name:
        return jsonify({"message": "Full name is required."}), 400
    if not validate_email(email):
        return jsonify({"message": "A valid email is required."}), 400
    if phone and not validate_phone(phone):
        return jsonify({"message": "A valid phone number is required."}), 400
    if not validate_password(password):
        return jsonify({"message": "Password must be at least 8 characters with a letter and number."}), 400
    if password != confirm:
        return jsonify({"message": "Passwords do not match."}), 400

    user, error = register_user(full_name, email, phone, password)
    if error:
        return jsonify({"message": error}), 409
    db.session.add(user)
    db.session.commit()

    token = issue_token(user)
    return jsonify({"message": "Account created successfully.", "token": token, "user": user.to_dict()}), 201


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    # "remember" flag accepted for future session extension

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password."}), 401

    token = issue_token(user)
    return jsonify({"message": "Login successful.", "token": token, "user": user.to_dict()}), 200


@auth_bp.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    from flask_jwt_extended import get_jwt_identity
    identity = get_jwt_identity()
    user = User.query.get(identity.get("id"))
    if not user:
        return jsonify({"message": "User not found."}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.route("/api/auth/logout", methods=["POST"])
@jwt_required()
def logout():
    # JWT is stateless; client discards token. Return confirmation.
    return jsonify({"message": "Logged out successfully."}), 200


@auth_bp.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    user = User.query.filter_by(email=email).first()
    # General response to avoid user enumeration
    return jsonify({"message": "If that email exists, a reset link has been sent."}), 200
