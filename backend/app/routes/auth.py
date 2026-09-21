from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from sqlalchemy import select
from .. import db
from ..models import User


auth_bp = Blueprint('auth', __name__)


def validate_email(email):
    return isinstance(email, str) and '@' in email and '.' in email.split('@')[-1]


@auth_bp.post('/register')
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    role = (data.get('role') or '').upper()
    if len(name) < 2 or len(name) > 100:
        return jsonify({'message': 'Name must be between 2 and 100 characters'}), 400
    if not validate_email(email):
        return jsonify({'message': 'Enter a valid email address'}), 400
    if len(password) < 8:
        return jsonify({'message': 'Password must be at least 8 characters'}), 400
    if role not in {'BUYER', 'SUPPLIER'}:
        return jsonify({'message': 'Role must be BUYER or SUPPLIER'}), 400
    if db.session.scalar(select(User).where(User.email == email)):
        return jsonify({'message': 'Email is already registered'}), 409
    user = User(name=name, email=email, role=role)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': token, 'user': user.to_dict()}), 201


@auth_bp.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    user = db.session.scalar(select(User).where(User.email == email))
    if not user or not user.check_password(password):
        return jsonify({'message': 'Invalid email or password'}), 401
    token = create_access_token(identity=str(user.id))
    return jsonify({'access_token': token, 'user': user.to_dict()})


@auth_bp.get('/me')
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify({'user': user.to_dict()})
