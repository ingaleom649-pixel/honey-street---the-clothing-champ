"""Product & category routes with filtering, sorting, searching, pagination."""
from flask import Blueprint, jsonify, request

from models.product import Category, Product

products_bp = Blueprint("products", __name__)

SORT_MAP = {
    "newest": "created_at",
    "price_asc": "discount_price",
    "price_desc": "discount_price",
    "popularity": "popularity",
    "rating": "rating",
}


@products_bp.route("/api/categories", methods=["GET"])
def get_categories():
    cats = Category.query.order_by(Category.name).all()
    return jsonify({"categories": [c.to_dict() for c in cats]}), 200


@products_bp.route("/api/products", methods=["GET"])
def get_products():
    args = request.args
    query = Product.query

    # Search
    q = args.get("q", "").strip()
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Product.name.ilike(like))
            | (Product.brand.ilike(like))
            | (Product.description.ilike(like))
        )

    # Category filter (slug or id)
    category = args.get("category", "").strip()
    if category:
        cat = Category.query.filter(
            (Category.slug == category) | (Category.name.ilike(category))
        ).first()
        if cat:
            query = query.filter(Product.category_id == cat.id)

    # Brand filter (comma separated)
    brands = [b.strip() for b in args.get("brand", "").split(",") if b.strip()]
    if brands:
        query = query.filter(Product.brand.in_(brands))

    # Size filter
    size = args.get("size", "").strip()
    if size:
        like = f"%{size}%"
        query = query.filter(Product.sizes.ilike(like))

    # Color filter
    color = args.get("color", "").strip()
    if color:
        like = f"%{color}%"
        query = query.filter(Product.colors.ilike(like))

    # Price range
    min_price = args.get("min_price", type=float)
    max_price = args.get("max_price", type=float)
    if min_price is not None or max_price is not None:
        price_col = Product.discount_price
        if min_price is not None:
            query = query.filter(price_col >= min_price)
        if max_price is not None:
            query = query.filter(price_col <= max_price)

    # Rating filter
    rating = args.get("rating", type=float)
    if rating is not None:
        query = query.filter(Product.rating >= rating)

    # Featured / trending flags
    featured = args.get("featured", "false") == "true"
    trending = args.get("trending", "false") == "true"
    new = args.get("new", "false") == "true"
    if featured:
        query = query.filter(Product.is_featured == True)  # noqa: E712
    if trending:
        query = query.filter(Product.is_trending == True)  # noqa: E712
    if new:
        query = query.filter(Product.is_new == True)  # noqa: E712

    # Sort
    sort = args.get("sort", "newest")
    if sort == "price_asc":
        query = query.order_by(Product.discount_price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.discount_price.desc())
    elif sort == "popularity":
        query = query.order_by(Product.popularity.desc())
    elif sort == "rating":
        query = query.order_by(Product.rating.desc())
    else:
        query = query.order_by(Product.created_at.desc())

    # Pagination
    page = args.get("page", 1, type=int)
    per_page = args.get("limit", 12, type=int)
    per_page = min(per_page, 48)
    total = query.count()
    products = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "products": [p.to_dict() for p in products],
        "total": total,
        "page": page,
        "pages": (total + per_page - 1) // per_page if total else 0,
        "limit": per_page,
    }), 200


@products_bp.route("/api/products/<slug>", methods=["GET"])
def get_product(slug):
    product = Product.query.filter_by(slug=slug).first()
    if not product:
        return jsonify({"message": "Product not found."}), 404
    return jsonify({"product": product.to_dict()}), 200


@products_bp.route("/api/products/<int:pid>/related", methods=["GET"])
def get_related(pid):
    product = Product.query.get(pid)
    if not product:
        return jsonify({"message": "Product not found."}), 404
    related = Product.query.filter(
        (Product.category_id == product.category_id) & (Product.id != pid)
    ).limit(4).all()
    if len(related) < 4:
        extra = Product.query.filter(Product.id != pid).limit(4 - len(related)).all()
        related.extend(extra)
    return jsonify({"products": [p.to_dict() for p in related]}), 200


@products_bp.route("/api/brands", methods=["GET"])
def get_brands():
    brands = [b.brand for b in Product.query.with_entities(Product.brand).distinct().all()]
    return jsonify({"brands": sorted(brands)}), 200


@products_bp.route("/api/search", methods=["GET"])
def search():
    """Live search suggestions."""
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"suggestions": []}), 200
    like = f"%{q}%"
    results = Product.query.filter(
        (Product.name.ilike(like))
        | (Product.brand.ilike(like))
        | (Product.description.ilike(like))
    ).limit(8).all()
    suggestions = [
        {"id": p.id, "name": p.name, "image": p.main_image(),
         "price": p.discount_price or p.price, "slug": p.slug}
        for p in results
    ]
    return jsonify({"suggestions": suggestions}), 200
