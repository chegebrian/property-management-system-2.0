from flask import request, jsonify
from flask_jwt_extended import (
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from config import app, db, bcrypt
from models import User, Property, Tenant, RentPayment
from datetime import datetime


# ─────────────────────────────────────────────
#  AUTH ROUTES
# ─────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    try:
        user = User(
            username=data["username"],
            email=data["email"],
            role=data.get("role", "admin"),
        )
        user.set_password(data["password"])
        db.session.add(user)
        db.session.commit()
        token = create_access_token(identity=(user.id))
        return jsonify({"token": token, "user": user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get("email")).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_access_token(identity=(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


# ─────────────────────────────────────────────
#  PROPERTY ROUTES (Full CRUD)
# ─────────────────────────────────────────────

@app.route("/api/properties", methods=["GET"])
@jwt_required()
def get_properties():
    user_id = get_jwt_identity()
    props = Property.query.filter_by(user_id=user_id).all()
    return jsonify([p.to_dict() for p in props]), 200


@app.route("/api/properties/<int:id>", methods=["GET"])
@jwt_required()
def get_property(id):
    prop = Property.query.get_or_404(id)
    return jsonify(prop.to_dict()), 200


@app.route("/api/properties", methods=["POST"])
@jwt_required()
def create_property():
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        prop = Property(
            name=data["name"],
            address=data["address"],
            city=data["city"],
            state=data["state"],
            property_type=data["property_type"],
            num_units=data.get("num_units", 1),
            monthly_rent=data["monthly_rent"],
            description=data.get("description", ""),
            user_id=user_id,
        )
        db.session.add(prop)
        db.session.commit()
        return jsonify(prop.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/properties/<int:id>", methods=["PATCH"])
@jwt_required()
def update_property(id):
    prop = Property.query.get_or_404(id)
    data = request.get_json()
    try:
        for field in ["name", "address", "city", "state", "property_type", "num_units", "monthly_rent", "description"]:
            if field in data:
                setattr(prop, field, data[field])
        db.session.commit()
        return jsonify(prop.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/properties/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_property(id):
    prop = Property.query.get_or_404(id)
    db.session.delete(prop)
    db.session.commit()
    return jsonify({"message": "Property deleted"}), 200


# ─────────────────────────────────────────────
#  TENANT ROUTES (Full CRUD)
# ─────────────────────────────────────────────

# @app.route("/api/tenants", methods=["GET"])
# @jwt_required()
# def get_tenants():
#     tenants = Tenant.query.all()
#     return jsonify([t.to_dict() for t in tenants]), 200

# @app.route("/api/tenants", methods=["GET"])
# @jwt_required()
# def get_tenants():
#     tenants = Tenant.query.all()
#     return jsonify([t.to_dict() for t in tenants]), 200

@app.route("/api/tenants", methods=["GET"])
@jwt_required()
def get_tenants():
    user_id = get_jwt_identity()

    tenants = Tenant.query.join(RentPayment).join(Property).filter(
        Property.user_id == user_id
    ).all()

    return jsonify([t.to_dict() for t in tenants]), 200


@app.route("/api/tenants/<int:id>", methods=["GET"])
@jwt_required()
def get_tenant(id):
    tenant = Tenant.query.get_or_404(id)
    return jsonify(tenant.to_dict()), 200


@app.route("/api/tenants", methods=["POST"])
@jwt_required()
def create_tenant():
    data = request.get_json()
    try:
        tenant = Tenant(
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=data["email"],
            phone=data["phone"],
            national_id=data.get("national_id", ""),
            emergency_contact=data.get("emergency_contact", ""),
        )
        db.session.add(tenant)
        db.session.commit()
        return jsonify(tenant.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/tenants/<int:id>", methods=["PATCH"])
@jwt_required()
def update_tenant(id):
    tenant = Tenant.query.get_or_404(id)
    data = request.get_json()
    try:
        for field in ["first_name", "last_name", "email", "phone", "national_id", "emergency_contact"]:
            if field in data:
                setattr(tenant, field, data[field])
        db.session.commit()
        return jsonify(tenant.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/tenants/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_tenant(id):
    tenant = Tenant.query.get_or_404(id)
    db.session.delete(tenant)
    db.session.commit()
    return jsonify({"message": "Tenant deleted"}), 200


# ─────────────────────────────────────────────
#  RENT PAYMENT ROUTES (Full CRUD)
# ─────────────────────────────────────────────

# @app.route("/api/rent-payments", methods=["GET"])
# @jwt_required()
# def get_rent_payments():
#     payments = RentPayment.query.all()
#     return jsonify([p.to_dict() for p in payments]), 200


@app.route("/api/rent-payments/<int:id>", methods=["GET"])
@jwt_required()
def get_rent_payment(id):
    payment = RentPayment.query.get_or_404(id)
    return jsonify(payment.to_dict()), 200

@app.route("/api/rent-payments", methods=["GET"])
@jwt_required()
def get_rent_payments():
    user_id = get_jwt_identity()

    payments = RentPayment.query.join(Property).filter(
        Property.user_id == user_id
    ).all()

    return jsonify([p.to_dict() for p in payments]), 200


@app.route("/api/rent-payments", methods=["POST"])
@jwt_required()
def create_rent_payment():
    data = request.get_json()
    try:
        payment = RentPayment(
            tenant_id=data["tenant_id"],
            property_id=data["property_id"],
            amount_paid=data["amount_paid"],
            payment_date=datetime.strptime(data["payment_date"], "%Y-%m-%d").date(),
            due_date=datetime.strptime(data["due_date"], "%Y-%m-%d").date(),
            status=data.get("status", "pending"),
            payment_method=data.get("payment_method", "cash"),
            notes=data.get("notes", ""),
        )
        db.session.add(payment)
        db.session.commit()
        return jsonify(payment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/rent-payments/<int:id>", methods=["PATCH"])
@jwt_required()
def update_rent_payment(id):
    payment = RentPayment.query.get_or_404(id)
    data = request.get_json()
    try:
        for field in ["amount_paid", "status", "payment_method", "notes"]:
            if field in data:
                setattr(payment, field, data[field])
        if "payment_date" in data:
            payment.payment_date = datetime.strptime(data["payment_date"], "%Y-%m-%d").date()
        if "due_date" in data:
            payment.due_date = datetime.strptime(data["due_date"], "%Y-%m-%d").date()
        db.session.commit()
        return jsonify(payment.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@app.route("/api/rent-payments/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_rent_payment(id):
    payment = RentPayment.query.get_or_404(id)
    db.session.delete(payment)
    db.session.commit()
    return jsonify({"message": "Rent payment deleted"}), 200


# ─────────────────────────────────────────────
#  DASHBOARD / REPORTS
# ─────────────────────────────────────────────

# @app.route("/api/dashboard", methods=["GET"])
# @jwt_required()
# def dashboard():
#     user_id = get_jwt_identity()
#     total_properties = Property.query.filter_by(user_id=user_id).count()
#     total_tenants = Tenant.query.count()
#     total_payments = RentPayment.query.count()
#     paid = RentPayment.query.filter_by(status="paid").count()
#     pending = RentPayment.query.filter_by(status="pending").count()
#     overdue = RentPayment.query.filter_by(status="overdue").count()
#     total_revenue = db.session.query(
#         db.func.sum(RentPayment.amount_paid)
#     ).filter_by(status="paid").scalar() or 0

#     return jsonify({
#         "total_properties": total_properties,
#         "total_tenants": total_tenants,
#         "total_payments": total_payments,
#         "paid": paid,
#         "pending": pending,
#         "overdue": overdue,
#         "total_revenue": round(total_revenue, 2),
#     }), 200

@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    user_id = get_jwt_identity()

    # Properties (already correct)
    total_properties = Property.query.filter_by(user_id=user_id).count()

    # Payments (filter via Property)
    payments_query = RentPayment.query.join(Property).filter(
        Property.user_id == user_id
    )

    total_payments = payments_query.count()
    paid = payments_query.filter(RentPayment.status == "paid").count()
    pending = payments_query.filter(RentPayment.status == "pending").count()
    overdue = payments_query.filter(RentPayment.status == "overdue").count()

    # Revenue (only user's payments)
    total_revenue = db.session.query(
        db.func.sum(RentPayment.amount_paid)
    ).join(Property).filter(
        Property.user_id == user_id,
        RentPayment.status == "paid"
    ).scalar() or 0

    # Tenants (filter via payments → property)
    total_tenants = db.session.query(Tenant).join(RentPayment).join(Property).filter(
        Property.user_id == user_id
    ).distinct().count()

    return jsonify({
        "total_properties": total_properties,
        "total_tenants": total_tenants,
        "total_payments": total_payments,
        "paid": paid,
        "pending": pending,
        "overdue": overdue,
        "total_revenue": float(total_revenue),
    }), 200

# if __name__ == "__main__":
#     app.run()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5555)
