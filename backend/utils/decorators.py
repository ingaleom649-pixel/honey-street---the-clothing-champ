"""Custom decorators for authentication and authorization."""
from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from models.user import User


def admin_required(fn):
    """Ensure the current JWT user is an admin."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = User.query.get(identity.get("id"))
        if not user:
            return jsonify({"message": "User not found"}), 401
        if user.role != "admin":
            return jsonify({"message": "Admin access required"}), 403
        return fn(*args, **kwargs)

    return wrapper


def customer_required(fn):
    """Ensure a valid JWT user is present (customer or admin)."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = User.query.get(identity.get("id"))
        if not user:
            return jsonify({"message": "User not found"}), 401
        return fn(*args, **kwargs)

    return wrapper
