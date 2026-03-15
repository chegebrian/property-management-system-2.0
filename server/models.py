from config import db, bcrypt
from sqlalchemy_serializer import SerializerMixin
from sqlalchemy.orm import validates
from datetime import datetime
import re


class User(db.Model, SerializerMixin):
    __tablename__ = "users"

    serialize_rules = ("-password_hash", "-properties.user")

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default="admin")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # One-to-many: User has many Properties
    properties = db.relationship("Property", back_populates="user", cascade="all, delete-orphan")

    @validates("email")
    def validate_email(self, key, value):
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w{2,}$"
        if not re.match(pattern, value):
            raise ValueError("Invalid email address format.")
        return value

    @validates("username")
    def validate_username(self, key, value):
        if len(value) < 3:
            raise ValueError("Username must be at least 3 characters.")
        return value

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f"<User {self.username}>"


class Property(db.Model, SerializerMixin):
    __tablename__ = "properties"

    serialize_rules = ("-user.properties", "-tenants.properties", "-rent_payments.property")

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(80), nullable=False)
    state = db.Column(db.String(80), nullable=False)
    property_type = db.Column(db.String(50), nullable=False)  # apartment, house, commercial
    num_units = db.Column(db.Integer, default=1)
    monthly_rent = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # FK to User
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Relationships
    user = db.relationship("User", back_populates="properties")
    rent_payments = db.relationship("RentPayment", back_populates="property", cascade="all, delete-orphan")

    # Many-to-many: Property <-> Tenant through RentPayment
    tenants = db.relationship("Tenant", secondary="rent_payments", viewonly=True)

    @validates("monthly_rent")
    def validate_rent(self, key, value):
        if float(value) <= 0:
            raise ValueError("Monthly rent must be a positive number.")
        return value

    @validates("num_units")
    def validate_units(self, key, value):
        if int(value) < 1:
            raise ValueError("Number of units must be at least 1.")
        return value

    def __repr__(self):
        return f"<Property {self.name}>"


class Tenant(db.Model, SerializerMixin):
    __tablename__ = "tenants"

    serialize_rules = ("-properties.tenants", "-rent_payments.tenant")

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    national_id = db.Column(db.String(50), unique=True)
    emergency_contact = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Many-to-many: Tenant <-> Property through RentPayment
    rent_payments = db.relationship("RentPayment", back_populates="tenant", cascade="all, delete-orphan")
    properties = db.relationship("Property", secondary="rent_payments", viewonly=True)

    @validates("email")
    def validate_email(self, key, value):
        pattern = r"^[\w\.-]+@[\w\.-]+\.\w{2,}$"
        if not re.match(pattern, value):
            raise ValueError("Invalid email format.")
        return value

    @validates("phone")
    def validate_phone(self, key, value):
        pattern = r"^\+?[\d\s\-]{7,15}$"
        if not re.match(pattern, value):
            raise ValueError("Invalid phone number format.")
        return value

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"<Tenant {self.full_name}>"


class RentPayment(db.Model, SerializerMixin):
    """
    Association table (many-to-many between Tenant and Property)
    with user-submittable attributes: amount_paid, payment_date, status, notes
    """
    __tablename__ = "rent_payments"

    serialize_rules = ("-tenant.rent_payments", "-property.rent_payments")

    id = db.Column(db.Integer, primary_key=True)

    # Foreign keys
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=False)

    # User-submittable attributes
    amount_paid = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default="pending")  # paid, pending, overdue
    payment_method = db.Column(db.String(50), default="cash")  # cash, bank_transfer, mpesa
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    tenant = db.relationship("Tenant", back_populates="rent_payments")
    property = db.relationship("Property", back_populates="rent_payments")

    @validates("amount_paid")
    def validate_amount(self, key, value):
        if float(value) <= 0:
            raise ValueError("Amount paid must be a positive number.")
        return value

    @validates("status")
    def validate_status(self, key, value):
        allowed = ["paid", "pending", "overdue", "partial"]
        if value not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return value

    def __repr__(self):
        return f"<RentPayment Tenant:{self.tenant_id} Property:{self.property_id}>"
