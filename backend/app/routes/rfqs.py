from datetime import date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import select, or_
from .. import db
from ..models import User, RFQ
from ..utils.auth import role_required

rfq_bp = Blueprint('rfqs', __name__)


def validate_rfq(data):
    name = (data.get('product_name') or '').strip()
    description = (data.get('description') or '').strip()
    location = (data.get('delivery_location') or '').strip()
    try:
        quantity = float(data.get('quantity'))
    except (TypeError, ValueError):
        quantity = -1
    deadline_raw = data.get('deadline')
    if not 2 <= len(name) <= 150:
        return None, 'Product/service name must be 2–150 characters'
    if len(description) < 10:
        return None, 'Description must be at least 10 characters'
    if quantity <= 0:
        return None, 'Quantity must be greater than 0'
    if not location:
        return None, 'Delivery location is required'
    try:
        deadline = date.fromisoformat(deadline_raw)
    except (TypeError, ValueError):
        return None, 'Deadline must be a valid date'
    if deadline <= date.today():
        return None, 'Deadline must be in the future'
    return {'product_name': name, 'description': description, 'quantity': quantity, 'delivery_location': location, 'deadline': deadline}, None


def refresh_status(rfq):
    if rfq.status == 'OPEN' and rfq.deadline < date.today():
        rfq.status = 'CLOSED'
        db.session.commit()
    return rfq


@rfq_bp.get('/rfqs')
def list_rfqs():
    search = (request.args.get('search') or '').strip()
    location = (request.args.get('location') or '').strip()
    status = (request.args.get('status') or 'OPEN').upper()
    query = select(RFQ).order_by(RFQ.created_at.desc())
    if status in {'OPEN', 'CLOSED'}:
        query = query.where(RFQ.status == status)
    if search:
        like = f'%{search}%'
        query = query.where(or_(RFQ.product_name.ilike(like), RFQ.description.ilike(like), RFQ.delivery_location.ilike(like)))
    if location:
        query = query.where(RFQ.delivery_location.ilike(f'%{location}%'))
    rfqs = db.session.scalars(query).all()
    return jsonify([refresh_status(r).to_dict() for r in rfqs])


@rfq_bp.get('/rfqs/<int:rfq_id>')
def get_rfq(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)
    if not rfq:
        return jsonify({'message': 'RFQ not found'}), 404
    return jsonify(refresh_status(rfq).to_dict())


@rfq_bp.post('/rfqs')
@role_required('BUYER')
def create_rfq():
    data = request.get_json(silent=True) or {}
    clean, error = validate_rfq(data)
    if error:
        return jsonify({'message': error}), 400
    buyer = db.session.get(User, int(get_jwt_identity()))
    rfq = RFQ(buyer_id=buyer.id, **clean)
    db.session.add(rfq)
    db.session.commit()
    return jsonify(rfq.to_dict()), 201


@rfq_bp.put('/rfqs/<int:rfq_id>')
@role_required('BUYER')
def update_rfq(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)
    user_id = int(get_jwt_identity())
    if not rfq:
        return jsonify({'message': 'RFQ not found'}), 404
    if rfq.buyer_id != user_id:
        return jsonify({'message': 'You can only edit your own RFQs'}), 403
    data = request.get_json(silent=True) or {}
    clean, error = validate_rfq(data)
    if error:
        return jsonify({'message': error}), 400
    for key, value in clean.items():
        setattr(rfq, key, value)
    db.session.commit()
    return jsonify(rfq.to_dict())


@rfq_bp.delete('/rfqs/<int:rfq_id>')
@role_required('BUYER')
def delete_rfq(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)
    if not rfq:
        return jsonify({'message': 'RFQ not found'}), 404
    if rfq.buyer_id != int(get_jwt_identity()):
        return jsonify({'message': 'You can only delete your own RFQs'}), 403
    db.session.delete(rfq)
    db.session.commit()
    return jsonify({'success': True})


@rfq_bp.get('/buyer/rfqs')
@role_required('BUYER')
def buyer_rfqs():
    rfqs = db.session.scalars(select(RFQ).where(RFQ.buyer_id == int(get_jwt_identity())).order_by(RFQ.created_at.desc())).all()
    return jsonify([refresh_status(r).to_dict() for r in rfqs])


@rfq_bp.post('/rfqs/expire')
def expire_rfqs():
    rfqs = db.session.scalars(select(RFQ).where(RFQ.status == 'OPEN', RFQ.deadline < date.today())).all()
    for rfq in rfqs:
        rfq.status = 'CLOSED'
    db.session.commit()
    return jsonify({'closed_count': len(rfqs)})
