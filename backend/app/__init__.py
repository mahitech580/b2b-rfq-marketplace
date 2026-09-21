from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_sqlalchemy import SQLAlchemy
from .config import Config


db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, origins=app.config['CORS_ORIGINS'])

    from .models import User, RFQ, Quotation  # noqa: F401
    from .routes.auth import auth_bp
    from .routes.rfqs import rfq_bp
    from .routes.quotations import quotation_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(rfq_bp, url_prefix='/api')
    app.register_blueprint(quotation_bp, url_prefix='/api')

    @app.get('/api/health')
    def health():
        return jsonify({'status': 'ok', 'service': 'rfq-api'})

    @app.errorhandler(404)
    def not_found(_):
        return jsonify({'message': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(_):
        return jsonify({'message': 'Internal server error'}), 500

    with app.app_context():
        db.create_all()

    return app
