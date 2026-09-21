from datetime import date
from decimal import Decimal, InvalidOperation

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models import RFQ, Quotation
from ..utils.auth import role_required


quotation_bp = Blueprint("quotations", __name__)


@quotation_bp.post("/rfqs/<int:rfq_id>/quotations")
@role_required("SUPPLIER")
def create_quotation(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)

    if not rfq:
        return jsonify({
            "message": "RFQ not found"
        }), 404

    if rfq.status != "OPEN":
        return jsonify({
            "message": "This RFQ is closed"
        }), 400

    if rfq.deadline < date.today():
        return jsonify({
            "message": "The RFQ deadline has expired"
        }), 400

    supplier_id = int(get_jwt_identity())

    if rfq.buyer_id == supplier_id:
        return jsonify({
            "message": "You cannot quote on your own RFQ"
        }), 400

    data = request.get_json(silent=True) or {}

    # Validate quoted price.
    try:
        quoted_price = Decimal(str(data.get("quoted_price")))
    except (InvalidOperation, TypeError, ValueError):
        return jsonify({
            "message": "Enter a valid quoted price"
        }), 400

    if quoted_price <= 0:
        return jsonify({
            "message": "Quoted price must be greater than 0"
        }), 400

    # Validate delivery days.
    try:
        delivery_days = int(data.get("estimated_delivery_days"))
    except (TypeError, ValueError):
        return jsonify({
            "message": "Enter a valid delivery time"
        }), 400

    if delivery_days <= 0:
        return jsonify({
            "message": "Estimated delivery must be greater than 0 days"
        }), 400

    message = (data.get("message") or "").strip()

    if len(message) > 2000:
        return jsonify({
            "message": "Message is too long"
        }), 400

    # Prevent duplicate quotations.
    existing_quote = db.session.scalar(
        select(Quotation).where(
            Quotation.rfq_id == rfq_id,
            Quotation.supplier_id == supplier_id
        )
    )

    if existing_quote:
        return jsonify({
            "message": "You already submitted a quotation for this RFQ"
        }), 409

    quotation = Quotation(
        rfq_id=rfq_id,
        supplier_id=supplier_id,
        quoted_price=quoted_price,
        estimated_delivery_days=delivery_days,
        message=message
    )

    db.session.add(quotation)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "message": "Unable to create quotation"
        }), 409

    return jsonify(quotation.to_dict()), 201


@quotation_bp.get("/rfqs/<int:rfq_id>/quotations")
@role_required("BUYER")
def rfq_quotations(rfq_id):
    rfq = db.session.get(RFQ, rfq_id)

    if not rfq:
        return jsonify({
            "message": "RFQ not found"
        }), 404

    buyer_id = int(get_jwt_identity())

    if rfq.buyer_id != buyer_id:
        return jsonify({
            "message": "You are not allowed to view these quotations"
        }), 403

    quotes = db.session.scalars(
        select(Quotation)
        .where(Quotation.rfq_id == rfq_id)
        .order_by(Quotation.created_at.desc())
    ).all()

    return jsonify([
        quote.to_dict()
        for quote in quotes
    ]), 200


@quotation_bp.get("/supplier/quotations")
@role_required("SUPPLIER")
def supplier_quotations():
    supplier_id = int(get_jwt_identity())

    quotes = db.session.scalars(
        select(Quotation)
        .where(Quotation.supplier_id == supplier_id)
        .order_by(Quotation.created_at.desc())
    ).all()

    result = []

    for quote in quotes:
        item = quote.to_dict()

        item["rfq"] = (
            quote.rfq.to_dict()
            if quote.rfq
            else None
        )

        result.append(item)

    return jsonify(result), 200