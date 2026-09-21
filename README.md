# B2B RFQ Marketplace

A mini B2B Request-for-Quotation marketplace built for a full-stack software development assignment.

## Live / GitHub Pages mode

The `frontend` is a static React/Vite app and can be deployed directly to GitHub Pages.

**GitHub Pages mode:** the frontend automatically uses browser-local persistence (`localStorage`) when `VITE_API_BASE_URL` is not configured. This makes the assignment demo usable entirely from GitHub Pages, including Buyer and Supplier flows, validation, authorization at the UI layer, loading/empty/error states, search/filtering, deadline handling, and quotations.

**Important technical limitation:** GitHub Pages does not execute Python or MySQL. The repository therefore also contains a real Flask + MySQL backend under `backend/` for environments that support server-side execution. Do not represent the GitHub Pages demo mode as a server-side database deployment.

## Features

### Buyer
- Register / login
- Create RFQs
- Edit and delete own RFQs
- Product/service name, description, quantity, delivery location and deadline
- View own RFQs
- View received supplier quotations
- Automatic deadline closure

### Supplier
- Register / login
- Browse open RFQs
- Search RFQs
- Filter by location
- View complete RFQ details
- Submit quotations with price, delivery time and notes
- View previously submitted quotations
- Duplicate quotation prevention

## Technology

Frontend:
- React
- Vite
- React Router
- HTML / CSS / JavaScript

Backend:
- Python
- Flask
- Flask-JWT-Extended
- Flask-SQLAlchemy
- PyMySQL

Database:
- MySQL

## Frontend architecture

```text
React UI
  -> api.js service layer
     -> GitHub Pages demo mode (localStorage)
     -> Real REST API mode when VITE_API_BASE_URL is configured
```

## Backend architecture

```text
React
  -> REST API
     -> Flask routes
        -> authentication + role authorization
           -> SQLAlchemy models
              -> MySQL
```

## Data model

```text
users
  1 ───────< rfqs
  1 ───────< quotations
rfqs
  1 ───────< quotations
```

Main tables:
- `users`
- `rfqs`
- `quotations`

The `quotations` table has a unique constraint on `(rfq_id, supplier_id)` so a supplier cannot quote on the same RFQ twice.

## Demo accounts

Buyer:
- Email: `buyer@demo.com`
- Password: `Buyer@123`

Supplier:
- Email: `supplier@demo.com`
- Password: `Supplier@123`

## Run the GitHub Pages frontend locally

```bash
cd frontend
npm install
npm run dev
```

To build:

```bash
npm run build
```

The production files are generated in `frontend/dist`.

## GitHub Pages deployment

1. Push the repository to GitHub.
2. Configure GitHub Pages to publish from GitHub Actions (or publish the built `frontend/dist` output).
3. Because the app uses `HashRouter`, direct navigation works from static GitHub Pages hosting without a server rewrite rule.

A typical frontend URL is:

```text
https://YOUR_USERNAME.github.io/b2b-rfq-marketplace/
```

## Optional real backend mode

Create `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://YOUR-BACKEND-DOMAIN
```

Then rebuild the frontend. When configured, `api.js` uses the real Flask REST API instead of localStorage.

## Run the Flask + MySQL backend locally

### 1. Create the MySQL database/user

Run `backend/schema.sql` in MySQL, or create the database manually.

### 2. Create and activate a virtual environment

Windows:

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
```

Linux/macOS:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create `.env`

Copy `.env.example` to `.env` and update the MySQL credentials and secrets.

### 5. Start the API

```bash
python run.py
```

Health check:

```text
http://127.0.0.1:5000/api/health
```

## API endpoints

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

### RFQ

```text
GET    /api/rfqs
GET    /api/rfqs/<id>
POST   /api/rfqs
PUT    /api/rfqs/<id>
DELETE /api/rfqs/<id>
GET    /api/buyer/rfqs
POST   /api/rfqs/expire
```

### Quotations

```text
POST /api/rfqs/<id>/quotations
GET  /api/rfqs/<id>/quotations
GET  /api/supplier/quotations
```

## Security / validation

- Passwords are hashed with Werkzeug.
- JWTs protect authenticated API routes.
- Role-based backend authorization is implemented for Buyer/Supplier operations.
- Backend validates RFQ data and quotation data.
- Ownership checks prevent editing/deleting another buyer's RFQ.
- Suppliers cannot quote on their own RFQs.
- Duplicate quotations are blocked by application validation and a database unique constraint.
- Secrets are loaded from environment variables.

## Assignment assumptions / limitations

- One RFQ has one buyer owner.
- One supplier can submit at most one quotation per RFQ.
- RFQs automatically close after their deadline.
- The GitHub Pages-only demonstration persists data locally in the browser; it is not a multi-user server database.
- The real Flask/MySQL implementation is included for a conventional full-stack deployment.

## AI usage

AI tools may be used as development assistance for scaffolding, debugging and documentation. The developer should review and understand every submitted file and be prepared to explain architecture, API behavior, authentication, authorization and database decisions during technical evaluation.
