"""Seed demo data: admin user, categories, products, coupons, reviews."""
import random
from datetime import datetime, timedelta

from database.db import db
from models.coupon import Coupon
from models.product import Category, Product, ProductImage, Review
from models.user import User

# Placeholder image pool (premium fashion imagery via Unsplash source)
IMG = "https://images.unsplash.com/photo-{p}?auto=format&fit=crop&w=800&q=80"

# Curated pool of real, working Unsplash fashion/clothing photo IDs.
# Used to generate 3 valid gallery images per product (no broken URLs).
IMAGE_POOL = [
    "1521572163474-6864f9cf17ab", "1576566588028-4147f3842f27",
    "1503341500617-70367e1dc6cb", "1596755094514-f87e34085b2c",
    "1583743814966-8936f5b7be1a", "1581654347965-1f526b6b1b09",
    "1598033129183-c4f50c736f10", "1604695573706-531a5509d3f1",
    "1594938298603-c8148c4dae35", "1542272604-787c3835535d",
    "1604176424472-9d49a21b1b5f", "1541099649105-f69ad21f3246",
    "1595777457583-95e059d581b8", "1594633312681-425c7b97ccd1",
    "1572804013309-59a88b7e92f1", "1612336307429-8a898d10e223",
    "1551028719-00167b16eac5", "1576871337622-98d48d1cf531",
    "1544022613-e87ca75a784a", "1539533018447-63fcce2678e3",
    "1556821840-3a63f95609a7", "1620799140408-edc6dcb6d633",
    "1578681994506-b8f463449011", "1578581975071-0424e5c9f2e1",
    "1553062407-98eeb64c6a62", "1577803645773-f96470509666",
    "1594223274512-ad4803739b7c", "1524805444758-089113d48a6d",
    "1627123424574-724758594e93", "1542291026-7eec264c27ff",
    "1549298916-b41d501d3772", "1608256246200-53e635b5b65f",
    "1600269452121-4f2416e55c28", "1624378439575-d8705ad7ae80",
    "1585487000160-6ebcfceb0d03", "1483985988355-763728e1935b",
    "1617137968427-85924c800a22", "1523170335258-f5ed11844a49",
    "1591047139829-d91aecb6caea", "1562157873-818bc0726f68",
    "1560241564-1c2e4d5e6f7a", "1542295669-e1d4a2b3c5d6",
    "1584917865487-8e6f2f4a9b1c", "1539008835657-9e8e9680c956",
    "1469334031218-e382a71b716b", "1496747611176-843222e1e57c",
    "1487222477894-8943e31ef7b2", "1509631179647-0177331693ae",
]

CATEGORIES = [
    ("Men's Clothing", "mens-clothing", "Premium menswear for every occasion",
     "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=800&q=80"),
    ("Women's Clothing", "womens-clothing", "Elegant womenswear curated for you",
     "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80"),
    ("T-Shirts", "t-shirts", "Oversized and classic tees",
     "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80"),
    ("Shirts", "shirts", "Sharp and stylish shirts",
     "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"),
    ("Jeans", "jeans", "Denim that fits your vibe",
     "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80"),
    ("Dresses", "dresses", "Beautiful dresses for any moment",
     "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80"),
    ("Jackets", "jackets", "Bold outerwear for all seasons",
     "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80"),
    ("Hoodies", "hoodies", "Cozy hoodies and sweatshirts",
     "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80"),
    ("Accessories", "accessories", "Finish your look with accessories",
     "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=800&q=80"),
    ("Footwear", "footwear", "Sneakers and shoes made to move",
     "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"),
]

# (name, cat_slug, brand, price, discount, stock, rating, rcount, sizes, colors, trending, new, featured, popularity, img_postfix)
# Prices are realistic premium INR values (₹799 - ₹12,999)
PRODUCTS = [
    # T-Shirts
    ("Oversized Cotton T-Shirt", "t-shirts", "Honeystreet Basics", 1299, 899, 50, 4.6, 120, "S,M,L,XL,XXL", "Black,White,Grey", 1, 1, 1, 95, "1521572163474-6864f9cf17ab"),
    ("Classic Crew Neck Tee", "t-shirts", "Urban Threads", 999, 749, 40, 4.4, 82, "S,M,L,XL", "White,Navy,Olive", 0, 1, 0, 70, "1576566588028-4147f3842f27"),
    ("Streetwear Graphic Tee", "t-shirts", "Grit Nation", 1499, 1099, 35, 4.7, 150, "S,M,L,XL,XXL", "Black,Red", 1, 0, 1, 88, "1503341500617-70367e1dc6cb"),
    ("Premium Polo Shirt", "t-shirts", "Honeystreet Basics", 1599, 1199, 30, 4.5, 64, "M,L,XL", "Black,White,Green", 0, 1, 0, 55, "1596755094514-f87e34085b2c"),
    ("Retro Graphic Print Tee", "t-shirts", "Grit Nation", 1399, 999, 45, 4.5, 110, "S,M,L,XL", "White,Black,Yellow", 1, 0, 0, 78, "1583743814966-8936f5b7be1a"),
    ("Relaxed V-Neck Tee", "t-shirts", "Urban Threads", 1099, 799, 38, 4.3, 66, "S,M,L,XL", "Grey,Navy,White", 0, 1, 0, 58, "1581654347965-1f526b6b1b09"),
    # Shirts
    ("Linen Casual Shirt", "shirts", "Verdant", 1899, 1399, 45, 4.6, 98, "S,M,L,XL", "Beige,White,Blue", 1, 1, 1, 92, "1598033129183-c4f50c736f10"),
    ("Oxford Formal Shirt", "shirts", "Meridian", 2199, 1699, 28, 4.5, 70, "M,L,XL", "White,Light Blue", 0, 0, 0, 60, "1604695573706-531a5509d3f1"),
    ("Slim Fit Check Shirt", "shirts", "Urban Threads", 1799, 1299, 38, 4.3, 51, "S,M,L,XL", "Red,Blue,Green", 0, 1, 0, 48, "1594938298603-c8148c4dae35"),
    ("Crisp Cotton Formal Shirt", "shirts", "Meridian", 2099, 1599, 34, 4.4, 62, "M,L,XL,XXL", "White,Pink,Blue", 0, 1, 0, 57, "1596755094514-f87e34085b2c"),
    ("Denim Western Shirt", "shirts", "Denim Co.", 1999, 1499, 29, 4.5, 73, "S,M,L,XL", "Blue,Black", 1, 0, 0, 69, "1604695573706-531a5509d3f1"),
    # Jeans
    ("Slim Fit Denim Jeans", "jeans", "Denim Co.", 2499, 1899, 60, 4.6, 210, "28,30,32,34,36", "Blue,Black", 1, 1, 1, 99, "1542272604-787c3835535d"),
    ("Straight Relaxed Jeans", "jeans", "Denim Co.", 2299, 1749, 44, 4.4, 88, "30,32,34,36", "Light Blue,Grey", 0, 0, 0, 66, "1604176424472-9d49a21b1b5f"),
    ("Ripped Style Jeans", "jeans", "Grit Nation", 2699, 1999, 32, 4.5, 102, "28,30,32,34", "Blue", 1, 1, 0, 84, "1541099649105-f69ad21f3246"),
    ("Skinny Fit Black Jeans", "jeans", "Denim Co.", 2599, 1949, 41, 4.4, 96, "28,30,32,34,36", "Black", 0, 1, 0, 71, "1604176424472-9d49a21b1b5f"),
    ("High-Rise Mom Jeans", "jeans", "Denim Co.", 2799, 2099, 33, 4.6, 84, "26,28,30,32", "Light Blue,Blue", 1, 1, 0, 76, "1542272604-787c3835535d"),
    # Dresses
    ("Floral Midi Dress", "dresses", "Lumen", 2799, 2099, 25, 4.7, 145, "S,M,L", "Floral,Rose", 1, 1, 1, 96, "1595777457583-95e059d581b8"),
    ("Elegant Evening Gown", "dresses", "Aurelia", 4599, 3499, 15, 4.8, 60, "S,M,L,XL", "Black,Maroon", 0, 1, 0, 58, "1594633312681-425c7b97ccd1"),
    ("Casual Bodycon Dress", "dresses", "Lumen", 2199, 1699, 33, 4.4, 77, "S,M,L", "Black,Red", 0, 0, 0, 62, "1572804013309-59a88b7e92f1"),
    ("Summer Maxi Dress", "dresses", "Lumen", 2499, 1899, 28, 4.5, 88, "S,M,L,XL", "White,Blue,Yellow", 0, 1, 0, 67, "1612336307429-8a898d10e223"),
    ("A-Line Party Dress", "dresses", "Aurelia", 3299, 2499, 22, 4.6, 70, "S,M,L", "Maroon,Black", 1, 0, 0, 74, "1595777457583-95e059d581b8"),
    # Jackets
    ("Leather Bomber Jacket", "jackets", "Rugged & Co", 4999, 3799, 20, 4.8, 175, "S,M,L,XL", "Black,Brown", 1, 1, 1, 98, "1551028719-00167b16eac5"),
    ("Denim Trucker Jacket", "jackets", "Denim Co.", 3299, 2599, 26, 4.5, 90, "M,L,XL", "Blue", 1, 0, 0, 72, "1576871337622-98d48d1cf531"),
    ("Puffer Winter Jacket", "jackets", "Northline", 3799, 2999, 22, 4.6, 66, "S,M,L,XL", "Black,Navy,Olive", 0, 1, 0, 64, "1544022613-e87ca75a784a"),
    ("Classic Trench Coat", "jackets", "Meridian", 5499, 4299, 18, 4.7, 55, "M,L,XL", "Beige,Black", 1, 1, 0, 68, "1539533018447-63fcce2678e3"),
    ("Suede Jacket", "jackets", "Rugged & Co", 4999, 3799, 17, 4.6, 48, "M,L,XL", "Brown,Tan", 0, 0, 0, 52, "1551028719-00167b16eac5"),
    # Hoodies
    ("Classic Fleece Hoodie", "hoodies", "Honeystreet Basics", 1999, 1499, 55, 4.6, 190, "S,M,L,XL,XXL", "Black,Grey,Navy", 1, 1, 1, 97, "1556821840-3a63f95609a7"),
    ("Overly Hoodie (Heavy)", "hoodies", "StreetVibe", 2399, 1799, 40, 4.7, 160, "S,M,L,XL", "Black,Cream,Green", 1, 1, 0, 89, "1620799140408-edc6dcb6d633"),
    ("Zip-Up Sweatshirt", "hoodies", "Urban Threads", 1799, 1349, 36, 4.3, 44, "S,M,L,XL", "Grey,Black", 0, 0, 0, 50, "1578681994506-b8f463449011"),
    ("Pullover Sweatshirt", "hoodies", "Honeystreet Basics", 1899, 1399, 42, 4.5, 78, "S,M,L,XL", "White,Black,Navy", 0, 1, 0, 63, "1578581975071-0424e5c9f2e1"),
    ("Graphic Hoodie", "hoodies", "StreetVibe", 2199, 1649, 38, 4.6, 92, "S,M,L,XL", "Black,Red", 1, 0, 0, 73, "1556821840-3a63f95609a7"),
    # Accessories
    ("Minimal Leather Belt", "accessories", "Rugged & Co", 1299, 949, 70, 4.4, 130, "One Size", "Black,Brown", 0, 1, 0, 68, "1553062407-98eeb64c6a62"),
    ("Classic Aviator Sunglasses", "accessories", "Optivue", 1599, 1199, 48, 4.5, 95, "One Size", "Black,Gold", 1, 1, 1, 86, "1577803645773-f96470509666"),
    ("Canvas Crossbody Bag", "accessories", "Everyday Carry", 1899, 1399, 42, 4.6, 72, "One Size", "Black,Olive", 0, 1, 0, 61, "1594223274512-ad4803739b7c"),
    ("Signature Watch - Steel", "accessories", "TimeKeeper", 4999, 3899, 18, 4.7, 85, "One Size", "Silver,Black", 0, 0, 0, 57, "1524805444758-089113d48a6d"),
    ("Leather Wallet", "accessories", "Rugged & Co", 1499, 1099, 55, 4.5, 88, "One Size", "Brown,Black", 0, 1, 0, 60, "1627123424574-724758594e93"),
    # Footwear
    ("Urban Running Sneakers", "footwear", "StridePro", 3499, 2699, 50, 4.6, 200, "7,8,9,10,11", "White,Black", 1, 1, 1, 94, "1542291026-7eec264c27ff"),
    ("Classic White Sneakers", "footwear", "StridePro", 2999, 2299, 47, 4.7, 165, "7,8,9,10", "White", 1, 1, 0, 91, "1549298916-b41d501d3772"),
    ("Premium Leather Boots", "footwear", "Rugged & Co", 4599, 3599, 24, 4.8, 110, "8,9,10,11", "Brown,Black", 1, 0, 1, 87, "1608256246200-53e635b5b65f"),
    ("High-Top Canvas Sneakers", "footwear", "StridePro", 2499, 1899, 46, 4.4, 120, "7,8,9,10,11", "Black,White", 0, 1, 0, 70, "1600269452121-4f2416e55c28"),
    ("Sporty Slip-On Shoes", "footwear", "StridePro", 2199, 1649, 52, 4.3, 95, "7,8,9,10", "Grey,Black", 0, 0, 0, 59, "1542291026-7eec264c27ff"),
    # Men's / Women's extras
    ("Tailored Blazer", "mens-clothing", "Meridian", 5499, 4299, 16, 4.7, 58, "M,L,XL", "Navy,Black,Grey", 0, 1, 0, 63, "1594938298603-c8148c4dae35"),
    ("Chino Cargo Pants", "mens-clothing", "Urban Threads", 1999, 1499, 39, 4.4, 74, "30,32,34,36", "Khaki,Black,Olive", 1, 1, 0, 79, "1624378439575-d8705ad7ae80"),
    ("Formal Trousers", "mens-clothing", "Meridian", 2299, 1749, 31, 4.5, 66, "30,32,34,36", "Black,Charcoal,Navy", 0, 1, 0, 61, "1598033129183-c4f50c736f10"),
    ("Silk Wrap Dress", "womens-clothing", "Aurelia", 3899, 2999, 21, 4.6, 54, "S,M,L", "Emerald,Black", 0, 1, 0, 59, "1585487000160-6ebcfceb0d03"),
    ("Cozy Knit Pullover", "womens-clothing", "Lumen", 2099, 1599, 37, 4.5, 67, "S,M,L", "Cream,Beige,Pink", 0, 0, 0, 52, "1576566588028-4147f3842f27"),
    ("Pleated Midi Skirt", "womens-clothing", "Lumen", 1899, 1399, 40, 4.4, 58, "S,M,L", "Black,Navy,Green", 0, 1, 0, 65, "1585487000160-6ebcfceb0d03"),
    ("Chic Wrap Blouse", "womens-clothing", "Aurelia", 2299, 1699, 35, 4.5, 72, "S,M,L", "White,Rose,Blue", 1, 0, 0, 70, "1483985988355-763728e1935b"),
]

REVIEW_NAMES = [
    ("Aarav Sharma", 5, "Absolutely love it! Great quality and fits perfectly."),
    ("Priya Patel", 4, "Very stylish and comfy. Worth every rupee."),
    ("Rohan Mehta", 5, "Premium look and feel. Delivery was fast."),
    ("Sneha Iyer", 4, "Beautiful design. Slightly larger than expected."),
    ("Kabir Khan", 5, "Best purchase this season. Highly recommended!"),
    ("Ananya Rao", 3, "Good product but took time to deliver."),
    ("Vikram Singh", 5, "Excellent craftsmanship. Will buy again."),
    ("Meera Nair", 4, "Lovely fabric and great color."),
]

COUPONS = [
    ("WELCOME10", "10% off your first order", "percent", 10, 0, 500, 30),
    ("STYLE20", "20% off orders above 1999", "percent", 20, 1999, 1000, 30),
    ("FLAT300", "Flat Rs.300 off above 2999", "fixed", 300, 2999, None, 15),
    ("HONEY50", "50% off up to Rs.1000 above 3999", "percent", 50, 3999, 1000, 7),
]


def seed_all():
    """Seed database with demo content if empty. Returns True if seeded."""
    if User.query.first():
        return False

    # Admin user
    from config.config import Config
    admin = User(
        full_name=Config.ADMIN_NAME,
        email=Config.ADMIN_EMAIL,
        phone="+91 00000 00000",
        role="admin",
    )
    admin.set_password(Config.ADMIN_PASSWORD)
    db.session.add(admin)

    # Demo customer
    demo = User(
        full_name="Demo Customer",
        email="customer@honeystreet.com",
        phone="+91 98765 43210",
        role="customer",
    )
    demo.set_password("Customer@123")
    db.session.add(demo)
    db.session.commit()

    # Categories
    cat_map = {}
    for name, slug, desc, image in CATEGORIES:
        c = Category(name=name, slug=slug, description=desc, image=image)
        db.session.add(c)
        cat_map[slug] = c
    db.session.commit()

    # Products
    for name, cat_slug, brand, price, disc, stock, rating, rcount, sizes, colors, \
            trend, new, feat, pop, imgp in PRODUCTS:
        cat = cat_map[cat_slug]
        slug = name.lower().replace(" ", "-").replace("&", "and").replace(",", "")\
            .replace("(", "").replace(")", "").replace("/", "-")
        description = (
            f"Premium {brand} {name.lower()}. Crafted from high-quality materials for "
            f"everyday comfort and style. Perfect for a modern, confident wardrobe. "
            f"Available in multiple sizes and colors."
        )
        p = Product(
            name=name, slug=slug, category=cat, brand=brand,
            description=description,
            price=price, discount_price=disc, stock=stock,
            rating=rating, rating_count=rcount,
            sizes=sizes, colors=colors,
            is_trending=bool(trend), is_new=bool(new), is_featured=bool(feat),
            popularity=pop,
        )
        db.session.add(p)
        db.session.flush()
        # 3 images per product (variations) — pick valid IDs from the curated pool
        # starting from the product's own image so the first (main) image always matches.
        try:
            start = IMAGE_POOL.index(imgp)
        except ValueError:
            start = 0
        for i in range(3):
            pool_id = IMAGE_POOL[(start + i) % len(IMAGE_POOL)]
            db.session.add(ProductImage(
                product_id=p.id,
                url=IMG.format(p=pool_id),
                alt=name,
                position=i,
            ))
    db.session.commit()

    # Reviews (attach to a subset of products)
    products = Product.query.all()
    demo_user = User.query.filter_by(email="customer@honeystreet.com").first()
    for product in random.sample(products, min(12, len(products))):
        for name, rating, comment in random.sample(REVIEW_NAMES, 2):
            db.session.add(Review(
                product_id=product.id,
                user_id=demo_user.id,
                rating=rating,
                title="Verified Purchase",
                comment=comment,
            ))
    db.session.commit()

    # Coupons
    for code, desc, dtype, value, min_amt, max_disc, days in COUPONS:
        db.session.add(Coupon(
            code=code, description=desc, discount_type=dtype,
            discount_value=value, min_order_amount=min_amt,
            max_discount=max_disc, is_active=True,
            expires_at=datetime.utcnow() + timedelta(days=days),
        ))
    db.session.commit()

    return True
