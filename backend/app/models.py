
from datetime import date, datetime

from werkzeug.security import check_password_hash, generate_password_hash

from . import db


# ============================================================
# HELPERS
# ============================================================

def utcnow():
    """
    Store timestamps in UTC.

    MySQL DATETIME does not retain timezone information, so the
    application stores naive UTC timestamps consistently.
    """
    return datetime.utcnow()


# ============================================================
# USER
# ============================================================

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    email = db.Column(
        db.String(190),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.Enum(
            "BUYER",
            "SUPPLIER",
            name="user_roles"
        ),
        nullable=False,
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=utcnow,
        nullable=False,
        index=True
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    rfqs = db.relationship(
        "RFQ",
        back_populates="buyer",
        foreign_keys="RFQ.buyer_id",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    quotations = db.relationship(
        "Quotation",
        back_populates="supplier",
        foreign_keys="Quotation.supplier_id",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    # --------------------------------------------------------
    # Password
    # --------------------------------------------------------

    def set_password(self, password: str) -> None:
        """
        Hash and store a user password.

        The plaintext password is never stored in the database.
        """
        if not password:
            raise ValueError("Password cannot be empty.")

        if len(password) < 8:
            raise ValueError(
                "Password must contain at least 8 characters."
            )

        self.password_hash = generate_password_hash(
            password
        )

    def check_password(self, password: str) -> bool:
        """
        Verify a plaintext password against the stored hash.
        """
        if not self.password_hash or not password:
            return False

        return check_password_hash(
            self.password_hash,
            password
        )

    # --------------------------------------------------------
    # Serialization
    # --------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }

    def __repr__(self) -> str:
        return (
            f"<User id={self.id} "
            f"email={self.email!r} "
            f"role={self.role!r}>"
        )


# ============================================================
# RFQ
# ============================================================

class RFQ(db.Model):
    __tablename__ = "rfqs"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    buyer_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "users.id",
            onupdate="CASCADE",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    product_name = db.Column(
        db.String(150),
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=False
    )

    quantity = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    delivery_location = db.Column(
        db.String(255),
        nullable=False
    )

    deadline = db.Column(
        db.Date,
        nullable=False,
        index=True
    )

    status = db.Column(
        db.Enum(
            "OPEN",
            "CLOSED",
            name="rfq_status"
        ),
        nullable=False,
        default="OPEN",
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=utcnow,
        nullable=False,
        index=True
    )

    updated_at = db.Column(
        db.DateTime,
        default=utcnow,
        onupdate=utcnow,
        nullable=False
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    buyer = db.relationship(
        "User",
        back_populates="rfqs",
        foreign_keys=[buyer_id]
    )

    quotations = db.relationship(
        "Quotation",
        back_populates="rfq",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    # --------------------------------------------------------
    # Table constraints / indexes
    # --------------------------------------------------------

    __table_args__ = (
        db.CheckConstraint(
            "quantity > 0",
            name="chk_rfqs_quantity_positive"
        ),

        db.CheckConstraint(
            "CHAR_LENGTH(TRIM(product_name)) >= 2",
            name="chk_rfqs_product_name"
        ),

        db.CheckConstraint(
            "CHAR_LENGTH(TRIM(description)) >= 10",
            name="chk_rfqs_description"
        ),

        db.CheckConstraint(
            "CHAR_LENGTH(TRIM(delivery_location)) >= 1",
            name="chk_rfqs_location"
        ),

        db.Index(
            "idx_rfqs_status_deadline",
            "status",
            "deadline"
        ),

        db.Index(
            "idx_rfqs_location",
            "delivery_location"
        ),

        db.Index(
            "idx_rfqs_product_name",
            "product_name"
        ),

        db.Index(
            "idx_rfqs_buyer_status",
            "buyer_id",
            "status"
        ),

        db.Index(
            "idx_rfqs_created_at",
            "created_at"
        ),
    )

    # --------------------------------------------------------
    # Business helpers
    # --------------------------------------------------------

    def is_expired(self) -> bool:
        """
        Return True when the RFQ deadline has passed.
        """
        return (
            self.deadline is not None
            and self.deadline < date.today()
        )

    def close_if_expired(self) -> bool:
        """
        Automatically close an expired open RFQ.

        Returns True when the status was changed.
        """
        if (
            self.status == "OPEN"
            and self.is_expired()
        ):
            self.status = "CLOSED"
            return True

        return False

    # --------------------------------------------------------
    # Serialization
    # --------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "buyer_id": self.buyer_id,
            "buyer_name": (
                self.buyer.name
                if self.buyer
                else None
            ),
            "product_name": self.product_name,
            "description": self.description,
            "quantity": (
                float(self.quantity)
                if self.quantity is not None
                else 0
            ),
            "delivery_location": self.delivery_location,
            "deadline": (
                self.deadline.isoformat()
                if self.deadline
                else None
            ),
            "status": self.status,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
        }

    def __repr__(self) -> str:
        return (
            f"<RFQ id={self.id} "
            f"product={self.product_name!r} "
            f"status={self.status!r}>"
        )


# ============================================================
# QUOTATION
# ============================================================

class Quotation(db.Model):
    __tablename__ = "quotations"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    rfq_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "rfqs.id",
            onupdate="CASCADE",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    supplier_id = db.Column(
        db.Integer,
        db.ForeignKey(
            "users.id",
            onupdate="CASCADE",
            ondelete="CASCADE"
        ),
        nullable=False,
        index=True
    )

    quoted_price = db.Column(
        db.Numeric(14, 2),
        nullable=False
    )

    estimated_delivery_days = db.Column(
        db.Integer,
        nullable=False
    )

    message = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=utcnow,
        nullable=False,
        index=True
    )

    updated_at = db.Column(
        db.DateTime,
        default=utcnow,
        onupdate=utcnow,
        nullable=False
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    rfq = db.relationship(
        "RFQ",
        back_populates="quotations",
        foreign_keys=[rfq_id]
    )

    supplier = db.relationship(
        "User",
        back_populates="quotations",
        foreign_keys=[supplier_id]
    )

    # --------------------------------------------------------
    # Table constraints / indexes
    # --------------------------------------------------------

    __table_args__ = (
        db.UniqueConstraint(
            "rfq_id",
            "supplier_id",
            name="uq_rfq_supplier"
        ),

        db.CheckConstraint(
            "quoted_price >= 0",
            name="chk_quotations_price"
        ),

        db.CheckConstraint(
            "estimated_delivery_days > 0",
            name="chk_quotations_delivery"
        ),

        db.CheckConstraint(
            "message IS NULL OR CHAR_LENGTH(message) <= 2000",
            name="chk_quotations_message"
        ),

        db.Index(
            "idx_quotations_rfq_price",
            "rfq_id",
            "quoted_price"
        ),

        db.Index(
            "idx_quotations_created_at",
            "created_at"
        ),
    )

    # --------------------------------------------------------
    # Business helpers
    # --------------------------------------------------------

    def can_be_submitted(self) -> bool:
        """
        Check whether this quotation belongs to an open RFQ
        whose deadline has not passed.
        """
        if not self.rfq:
            return False

        return (
            self.rfq.status == "OPEN"
            and not self.rfq.is_expired()
        )

    # --------------------------------------------------------
    # Serialization
    # --------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "rfq_id": self.rfq_id,
            "supplier_id": self.supplier_id,
            "supplier_name": (
                self.supplier.name
                if self.supplier
                else None
            ),
            "quoted_price": (
                float(self.quoted_price)
                if self.quoted_price is not None
                else 0
            ),
            "estimated_delivery_days": (
                self.estimated_delivery_days
            ),
            "message": self.message,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
        }

    def __repr__(self) -> str:
        return (
            f"<Quotation id={self.id} "
            f"rfq_id={self.rfq_id} "
            f"supplier_id={self.supplier_id} "
            f"price={self.quoted_price}>"
        )