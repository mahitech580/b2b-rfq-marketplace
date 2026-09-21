from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from . import db


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(190), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('BUYER', 'SUPPLIER', name='user_roles'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    rfqs = db.relationship('RFQ', back_populates='buyer', cascade='all, delete-orphan')
    quotations = db.relationship('Quotation', back_populates='supplier', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'email': self.email, 'role': self.role}


class RFQ(db.Model):
    __tablename__ = 'rfqs'
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    product_name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    quantity = db.Column(db.Numeric(12, 2), nullable=False)
    delivery_location = db.Column(db.String(255), nullable=False)
    deadline = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.Enum('OPEN', 'CLOSED', name='rfq_status'), nullable=False, default='OPEN')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    buyer = db.relationship('User', back_populates='rfqs')
    quotations = db.relationship('Quotation', back_populates='rfq', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'buyer_id': self.buyer_id,
            'buyer_name': self.buyer.name if self.buyer else None,
            'product_name': self.product_name,
            'description': self.description,
            'quantity': float(self.quantity),
            'delivery_location': self.delivery_location,
            'deadline': self.deadline.isoformat(),
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Quotation(db.Model):
    __tablename__ = 'quotations'
    id = db.Column(db.Integer, primary_key=True)
    rfq_id = db.Column(db.Integer, db.ForeignKey('rfqs.id'), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    quoted_price = db.Column(db.Numeric(14, 2), nullable=False)
    estimated_delivery_days = db.Column(db.Integer, nullable=False)
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (db.UniqueConstraint('rfq_id', 'supplier_id', name='uq_rfq_supplier'),)

    rfq = db.relationship('RFQ', back_populates='quotations')
    supplier = db.relationship('User', back_populates='quotations')

    def to_dict(self):
        return {
            'id': self.id,
            'rfq_id': self.rfq_id,
            'supplier_id': self.supplier_id,
            'supplier_name': self.supplier.name if self.supplier else None,
            'quoted_price': float(self.quoted_price),
            'estimated_delivery_days': self.estimated_delivery_days,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
