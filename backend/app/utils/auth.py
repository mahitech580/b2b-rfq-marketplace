from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from ..models import User


def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                user = db_user()
            except Exception:
                return jsonify({'message': 'Authentication required'}), 401
            if user.role not in roles:
                return jsonify({'message': 'You are not authorized for this action'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def db_user():
    from .. import db
    return db.session.get(User, int(get_jwt_identity()))
