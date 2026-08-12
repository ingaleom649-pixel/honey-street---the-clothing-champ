"""Authentication helpers."""
from flask_jwt_extended import create_access_token

from models.user import User


def issue_token(user):
    """Create a JWT access token for a user."""
    return create_access_token(
        identity={"id": user.id, "email": user.email, "role": user.role}
    )


def register_user(full_name, email, phone, password):
    """Create a new customer. Returns (user, error)."""
    if User.query.filter_by(email=email.lower()).first():
        return None, "An account with this email already exists."
    user = User(full_name=full_name, email=email.lower(), phone=phone, role="customer")
    user.set_password(password)
    return user, None
