"""Honeystreet Flask application factory."""
import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config.config import Config
from database.db import db, init_db
from utils.seed import seed_all

# Register blueprints
from routes.auth import auth_bp
from routes.products import products_bp
from routes.cart import cart_bp
from routes.wishlist import wishlist_bp
from routes.orders import orders_bp
from routes.reviews import reviews_bp
from routes.coupons import coupons_bp
from routes.profile import profile_bp
from routes.admin import admin_bp


def create_app():
    app = Flask(__name__, static_folder="../frontend", static_url_path="")
    app.config.from_object(Config)

    # CORS - allow frontend origins
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # JWT
    JWTManager(app)

    # Security headers
    @app.after_request
    def add_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

    # Initialize database + seed
    init_db(app)
    with app.app_context():
        seeded = seed_all()
        if seeded:
            print("=== Honeystreet database seeded with demo data ===")
            print(f"Admin login: {Config.ADMIN_EMAIL} / {Config.ADMIN_PASSWORD}")

    # Register API blueprints
    for bp in [auth_bp, products_bp, cart_bp, wishlist_bp, orders_bp,
               reviews_bp, coupons_bp, profile_bp, admin_bp]:
        app.register_blueprint(bp)

    # Health check
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "service": "Honeystreet API"}), 200

    # Serve frontend (Serving static HTML at root)
    @app.route("/", defaults={"path": "index.html"})
    @app.route("/<path:path>")
    def serve_frontend(path):
        if path.startswith("api/"):
            return jsonify({"message": "Not found"}), 404
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, "index.html")

    # Global error handler
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"message": "Resource not found."}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"message": "Internal server error."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 5000))
    app.run(host=host, port=port, debug=True)
