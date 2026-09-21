from datetime import date

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import or_, select

from .. import db
from ..models import User, RFQ
from ..utils.auth import role_required


rfq_bp = Blueprint("rfqs", __name__)


def validate_rfq(data):
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object"

    name = (data.get("product_name") or "").strip()
    description = (data.get("description") or "").strip()
    location = (data.get("delivery_location") or "").strip()

    try:
        quantity = float(data.get("quantity"))
    except (TypeError, ValueError):
        quantity = -1

    deadline_raw = data.get("deadline")

    if not 2 <= len(name) <= 150:
        return None, "Product/service name must be 2–150 characters"

    if len(description) < 10:
        return None, "Description must be at least 10 characters"

    if quantity <= 0:
        return None, "Quantity must be greater than 0"

    if not location:
        return None, "Delivery location is required"

    try:
        deadline = date.fromisoformat(deadline_raw)
    except (TypeError, ValueError):
        return None, "Deadline must be a valid date"

    if deadline <= date.today():
        return None, "Deadline must be in the future"

    return {
        "product_name": name,
        "description": description,
        "quantity": quantity,
        "delivery_location": location,
        "deadline": deadline,
    }, None


def rfq_to_dict(rfq):
    """
    Return the RFQ with an accurate effective status.

    Expired OPEN RFQs are shown as CLOSED without performing
    a database write during a GET request.
    """
    result = rfq.to_dict()

    if (
        result.get("status") == "OPEN"
        and rfq.deadline
        and rfq.deadline < date.today()
    ):
        result["status"] = "CLOSED"

    return result


def close_expired_rfqs():
    """
    Persist CLOSED status for all expired OPEN RFQs.
    Used by the explicit expiry endpoint.
    """
    rfqs = db.session.scalars(
        select(RFQ).where(
            RFQ.status == "OPEN",
            RFQ.deadline < date.today()
        )
    ).all()

    for rfq in rfqs:
        rfq.status = "CLOSED"

    if rfqs:
        db.session.commit()

    return rfqs


@rfq_bp.get("/rfqs")
def list_rfqs():
    search = (request.args.get("search") or "").strip()
    location = (request.args.get("location") or "").strip()
    status = (request.args.get("status") or "OPEN").upper()

    query = select(RFQ).order_by(RFQ.created_at.desc())

    if status in {"OPEN", "CLOSED"}:
        query = query.where(RFQ.status == status)

    if search:
        like = f"%{search}%"

        query = query.where(
            or_(
                RFQ.product_name.ilike(like),
                RFQ.description.ilike(like),
                RFQ.delivery_location.ilike(like),
            )
        )

    if location:
        query = query.where(
            RFQ.delivery_location.ilike(f"%{location}%")
        )

    rfqs = db.session.scalars(query).all()

    # Make expired OPEN RFQs appear CLOSED in the response.
    result = [
        rfq_to_dict(rfq)
        for rfq in rfqs
    ]

    # If the client asks for OPEN RFQs, don't return already-expired ones.
    if status == "OPEN":
        result = [
            item
            for item in result
            if item.get("status") == "OPEN"
        ]

    return jsonify(result), 200


@rfq_bp.get("/rfqs/<int:rfq_id>")
def get_rfq(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)

    if not rfq:
        return jsonify({
            "message": "RFQ not found"
        }), 404

    return jsonify(rfq_to_dict(rfq)), 200


@rfq_bp.post("/rfqs")
@role_required("BUYER")
def create_rfq():
    data = request.get_json(silent=True) or {}

    clean, error = validate_rfq(data)

    if error:
        return jsonify({
            "message": error
        }), 400

    buyer_id = int(get_jwt_identity())

    buyer = db.session.get(User, buyer_id)

    if not buyer:
        return jsonify({
            "message": "User not found"
        }), 401

    rfq = RFQ(
        buyer_id=buyer.id,
        **clean
    )

    db.session.add(rfq)
    db.session.commit()

    return jsonify(rfq.to_dict()), 201


@rfq_bp.put("/rfqs/<int:rfq_id>")
@role_required("BUYER")
def update_rfq(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)

    if not rfq:
        return jsonify({
            "message": "RFQ not found"
        }), 404

    user_id = int(get_jwt_identity())

    if rfq.buyer_id != user_id:
        return jsonify({
            "message": "You can only edit your own RFQs"
        }), 403

    if rfq.status != "OPEN" or (
        rfq.deadline and rfq.deadline < date.today()
    ):
        return jsonify({
            "message": "Closed or expired RFQs cannot be edited"
        }), 400

    data = request.get_json(silent=True) or {}

    clean, error = validate_rfq(data)

    if error:
        return jsonify({
            "message": error
        }), 400

    for key, value in clean.items():
        setattr(rfq, key, value)

    db.session.commit()

    return jsonify(rfq.to_dict()), 200


@rfq_bp.delete("/rfqs/<int:rfq_id>")
@role_required("BUYER")
def delete_rfq(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)

    if not rfq:
        return jsonify({
            "message": "RFQ not found"
        }), 404

    user_id = int(get_jwt_identity())

    if rfq.buyer_id != user_id:
        return jsonify({
            "message": "You can only delete your own RFQs"
        }), 403

    db.session.delete(rfq)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "RFQ deleted successfully"
    }), 200


@rfq_bp.get("/buyer/rfqs")
@role_required("BUYER")
def buyer_rfqs():
    buyer_id = int(get_jwt_identity())

    rfqs = db.session.scalars(
        select(RFQ)
        .where(RFQ.buyer_id == buyer_id)
        .order_by(RFQ.created_at.desc())
    ).all()

    return jsonify([
        rfq_to_dict(rfq)
        for rfq in rfqs
    ]), 200


@rfq_bp.post("/rfqs/expire")
@role_required("ADMIN")
def expire_rfqs():
    rfqs = close_expired_rfqs()

    return jsonify({
        "closed_count": len(rfqs)
    }), 200