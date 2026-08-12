"""Admin routes: dashboard stats, product/category/coupon/order/user management."""
import os

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.db import db
from models.cart import CartItem, WishlistItem
from models.coupon import Coupon
from models.order import Order, OrderItem
from models.product import Category, Product, ProductImage
from models.user import User
from utils.decorators import admin_required

admin_bp = Blueprint("admin", __name__)


def _save_image_url(data):
    """Extract image URL(s) from request payload (single or list)."""
    image = data.get("image")
    images = data.get("images")
    if images:
        return images if isinstance(images, list) else [images]
    if image:
        return [image]
    return []


@admin_bp.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password) or user.role != "admin":
        return jsonify({"message": "Invalid admin credentials."}), 401
    from services.auth_service import issue_token
    token = issue_token(user)
    return jsonify({"message": "Admin login successful.", "token": token, "user": user.to_dict()}), 200


@admin_bp.route("/api/admin/dashboard", methods=["GET"])
@admin_required
def dashboard():
    total_users = User.query.filter_by(role="customer").count()
    total_products = Product.query.count()
    total_orders = Order.query.count()
    total_revenue = db.session.query(db.func.coalesce(db.func.sum(Order.total), 0)).scalar()
    total_sales = db.session.query(db.func.coalesce(db.func.sum(OrderItem.quantity), 0)).scalar()

    # Recent orders
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(6).all()

    # Orders by status
    from models.order import ORDER_STATUSES
    order_status_counts = []
    for status in ORDER_STATUSES:
        order_status_counts.append({
            "status": status,
            "count": Order.query.filter_by(order_status=status).count(),
        })

    # Top products by popularity
    top_products = Product.query.order_by(Product.popularity.desc()).limit(5).all()

    # Recent orders (7 days) for chart
    from datetime import datetime, timedelta
    days = [datetime.utcnow() - timedelta(days=i) for i in range(6, -1, -1)]
    sales_by_day = []
    for day in days:
        next_day = day + timedelta(days=1)
        rev = db.session.query(db.func.coalesce(db.func.sum(Order.total), 0)).filter(
            Order.created_at >= day, Order.created_at < next_day
        ).scalar()
        sales_by_day.append({"date": day.strftime("%Y-%m-%d"), "revenue": round(rev, 2)})

    return jsonify({
        "stats": {
            "total_users": total_users,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_revenue": round(total_revenue, 2),
            "total_sales": total_sales,
        },
        "recent_orders": [o.to_dict() for o in recent_orders],
        "order_status_counts": order_status_counts,
        "top_products": [p.to_dict() for p in top_products],
        "sales_by_day": sales_by_day,
    }), 200


# ---- Products ----

@admin_bp.route("/api/admin/products", methods=["POST"])
@admin_required
def create_product():
    data = request.get_json(silent=True) or {}
    required = ["name", "price", "category_id", "brand", "description"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"message": "Missing fields: " + ", ".join(missing)}), 400

    slug = data["name"].lower().replace(" ", "-").replace("&", "and").replace(",", "").replace("(", "").replace(")", "")
    if Product.query.filter_by(slug=slug).first():
        slug = f"{slug}-{db.session.query(db.func.count(Product.id)).scalar() + 1}"

    product = Product(
        name=data["name"], slug=slug, brand=data["brand"],
        description=data["description"],
        price=data["price"], discount_price=data.get("discount_price"),
        category_id=data["category_id"],
        stock=data.get("stock", 0), rating=data.get("rating", 0),
        rating_count=data.get("rating_count", 0),
        sizes=",".join(data.get("sizes", [])) if isinstance(data.get("sizes"), list) else data.get("sizes", "S,M,L,XL"),
        colors=",".join(data.get("colors", [])) if isinstance(data.get("colors"), list) else data.get("colors", "Black,White"),
        is_trending=bool(data.get("is_trending")), is_new=bool(data.get("is_new")),
        is_featured=bool(data.get("is_featured")), popularity=data.get("popularity", 0),
    )
    db.session.add(product)
    db.session.flush()

    images = _save_image_url(data)
    if not images:
        images = ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"]
    for i, url in enumerate(images):
        db.session.add(ProductImage(product_id=product.id, url=url, position=i, alt=data["name"]))
    db.session.commit()
    return jsonify({"message": "Product created.", "product": product.to_dict()}), 201


@admin_bp.route("/api/admin/products/<int:pid>", methods=["PUT"])
@admin_required
def update_product(pid):
    product = Product.query.get(pid)
    if not product:
        return jsonify({"message": "Product not found."}), 404
    data = request.get_json(silent=True) or {}
    for field in ["name", "brand", "description", "price", "discount_price", "stock",
                  "category_id", "rating", "rating_count", "popularity"]:
        if field in data and data[field] is not None:
            setattr(product, field, data[field])
    for field in ["is_trending", "is_new", "is_featured"]:
        if field in data:
            setattr(product, field, bool(data[field]))
    if isinstance(data.get("sizes"), list):
        product.sizes = ",".join(data["sizes"])
    if isinstance(data.get("colors"), list):
        product.colors = ",".join(data["colors"])
    if data.get("images"):
        ProductImage.query.filter_by(product_id=pid).delete()
        for i, url in enumerate(data["images"]):
            db.session.add(ProductImage(product_id=pid, url=url, position=i, alt=product.name))
    db.session.commit()
    return jsonify({"message": "Product updated.", "product": product.to_dict()}), 200


@admin_bp.route("/api/admin/products/<int:pid>", methods=["DELETE"])
@admin_required
def delete_product(pid):
    product = Product.query.get(pid)
    if not product:
        return jsonify({"message": "Product not found."}), 404
    # Remove cart/wishlist references
    CartItem.query.filter_by(product_id=pid).delete()
    WishlistItem.query.filter_by(product_id=pid).delete()
    db.session.delete(product)
    db.session.commit()
    return jsonify({"message": "Product deleted."}), 200


# ---- Categories ----

@admin_bp.route("/api/admin/categories", methods=["POST"])
@admin_required
def create_category():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"message": "Category name is required."}), 400
    slug = data.get("slug") or name.lower().replace(" ", "-")
    if Category.query.filter_by(slug=slug).first():
        return jsonify({"message": "Category with this slug exists."}), 409
    cat = Category(name=name, slug=slug, description=data.get("description"), image=data.get("image"))
    db.session.add(cat)
    db.session.commit()
    return jsonify({"message": "Category created.", "category": cat.to_dict()}), 201


@admin_bp.route("/api/admin/categories/<int:cid>", methods=["PUT"])
@admin_required
def update_category(cid):
    cat = Category.query.get(cid)
    if not cat:
        return jsonify({"message": "Category not found."}), 404
    data = request.get_json(silent=True) or {}
    for field in ["name", "description", "image"]:
        if field in data:
            setattr(cat, field, data[field])
    if data.get("slug"):
        cat.slug = data["slug"].lower().replace(" ", "-")
    db.session.commit()
    return jsonify({"message": "Category updated.", "category": cat.to_dict()}), 200


@admin_bp.route("/api/admin/categories/<int:cid>", methods=["DELETE"])
@admin_required
def delete_category(cid):
    cat = Category.query.get(cid)
    if not cat:
        return jsonify({"message": "Category not found."}), 404
    if cat.products.count() > 0:
        return jsonify({"message": "Category has products. Move them first."}), 400
    db.session.delete(cat)
    db.session.commit()
    return jsonify({"message": "Category deleted."}), 200


# ---- Users ----

@admin_bp.route("/api/admin/users", methods=["GET"])
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200


@admin_bp.route("/api/admin/users/<int:uid>", methods=["DELETE"])
@admin_required
def delete_user(uid):
    user = User.query.get(uid)
    if not user:
        return jsonify({"message": "User not found."}), 404
    if user.role == "admin":
        return jsonify({"message": "Cannot delete an admin."}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted."}), 200


# ---- Orders ----

@admin_bp.route("/api/admin/orders", methods=["GET"])
@admin_required
def list_orders():
    status = request.args.get("status", "").strip()
    query = Order.query.order_by(Order.created_at.desc())
    if status:
        query = query.filter(Order.order_status == status)
    orders = query.all()
    return jsonify({"orders": [o.to_dict() for o in orders]}), 200


@admin_bp.route("/api/admin/orders/<order_id>/status", methods=["PUT"])
@admin_required
def update_order_status(order_id):
    order = Order.query.filter_by(order_id=order_id).first()
    if not order:
        return jsonify({"message": "Order not found."}), 404
    data = request.get_json(silent=True) or {}
    new_status = data.get("order_status")
    from models.order import ORDER_STATUSES
    if new_status not in ORDER_STATUSES:
        return jsonify({"message": "Invalid order status."}), 400
    order.order_status = new_status
    if new_status == "Delivered":
        order.payment_status = "Paid"
    db.session.commit()
    return jsonify({"message": "Order status updated.", "order": order.to_dict()}), 200


# ---- Coupons ----

@admin_bp.route("/api/admin/coupons", methods=["GET"])
@admin_required
def list_coupons():
    coupons = Coupon.query.order_by(Coupon.created_at.desc()).all()
    return jsonify({"coupons": [c.to_dict() for c in coupons]}), 200


@admin_bp.route("/api/admin/coupons", methods=["POST"])
@admin_required
def create_coupon():
    data = request.get_json(silent=True) or {}
    code = data.get("code", "").strip().upper()
    if not code:
        return jsonify({"message": "Coupon code is required."}), 400
    if Coupon.query.filter_by(code=code).first():
        return jsonify({"message": "Coupon already exists."}), 409
    coupon = Coupon(
        code=code, description=data.get("description"),
        discount_type=data.get("discount_type", "percent"),
        discount_value=data.get("discount_value", 0),
        min_order_amount=data.get("min_order_amount", 0),
        max_discount=data.get("max_discount"),
        is_active=data.get("is_active", True),
    )
    db.session.add(coupon)
    db.session.commit()
    return jsonify({"message": "Coupon created.", "coupon": coupon.to_dict()}), 201


@admin_bp.route("/api/admin/coupons/<int:cid>", methods=["PUT"])
@admin_required
def update_coupon(cid):
    coupon = Coupon.query.get(cid)
    if not coupon:
        return jsonify({"message": "Coupon not found."}), 404
    data = request.get_json(silent=True) or {}
    for field in ["description", "discount_type", "discount_value", "min_order_amount", "max_discount", "is_active"]:
        if field in data:
            setattr(coupon, field, data[field])
    if data.get("code"):
        coupon.code = data["code"].strip().upper()
    db.session.commit()
    return jsonify({"message": "Coupon updated.", "coupon": coupon.to_dict()}), 200


@admin_bp.route("/api/admin/coupons/<int:cid>", methods=["DELETE"])
@admin_required
def delete_coupon(cid):
    coupon = Coupon.query.get(cid)
    if not coupon:
        return jsonify({"message": "Coupon not found."}), 404
    db.session.delete(coupon)
    db.session.commit()
    return jsonify({"message": "Coupon deleted."}), 200
