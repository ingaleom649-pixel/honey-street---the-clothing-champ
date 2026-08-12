"""Input validation helpers."""
import re

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^[0-9+\-\s]{7,15}$")


def validate_email(email):
    return bool(email and EMAIL_RE.match(email))


def validate_phone(phone):
    return bool(phone and PHONE_RE.match(phone))


def validate_password(password):
    """At least 8 chars, one letter and one number."""
    if not password or len(password) < 8:
        return False
    if not re.search(r"[A-Za-z]", password):
        return False
    if not re.search(r"[0-9]", password):
        return False
    return True


def require_fields(data, fields):
    """Return list of missing field names."""
    missing = [f for f in fields if not data.get(f)]
    return missing
