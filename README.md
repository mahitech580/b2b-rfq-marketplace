# B2B RFQ Marketplace

A full-stack mini **B2B Request-for-Quotation (RFQ) Marketplace** built as a software development assignment.

The platform connects **Buyers** who create procurement requests with **Suppliers** who can discover those requests and submit quotations.

The project includes:

* A React + Vite frontend
* A Flask REST API backend
* MySQL database integration
* JWT authentication
* Role-based authorization
* Buyer and Supplier workflows
* GitHub Pages-compatible frontend demo mode using `localStorage`

---

## Overview

The B2B RFQ Marketplace supports the complete basic RFQ workflow:

```text
Buyer
  │
  ├── Register / Login
  ├── Create RFQ
  ├── Edit own RFQ
  ├── Delete own RFQ
  └── View supplier quotations
           │
           ▼
      RFQ Marketplace
           │
           ▼
Supplier
  │
  ├── Register / Login
  ├── Browse RFQs
  ├── Search / Filter RFQs
  ├── View RFQ details
  ├── Submit quotation
  └── View own quotations
```

---

# Features

## Buyer

* Register and login
* Create RFQs
* Edit own RFQs
* Delete own RFQs
* Specify:

  * Product/service name
  * Description
  * Quantity
  * Delivery location
  * Deadline
* View all personal RFQs
* View quotations received for own RFQs
* Automatic RFQ deadline handling
* Ownership validation for update/delete operations

## Supplier

* Register and login
* Browse available RFQs
* Search RFQs
* Filter by delivery location
* View complete RFQ details
* Submit quotations
* Specify:

  * Quoted price
  * Estimated delivery days
  * Additional message/notes
* View previously submitted quotations
* Duplicate quotation prevention
* Cannot quote on own RFQ

## Authentication & Authorization

* JWT-based authentication
* Password hashing using Werkzeug
* Backend role-based authorization
* Buyer-only operations
* Supplier-only operations
* Admin-only RFQ expiry operation
* Ownership checks on protected resources

---

# Technology Stack

## Frontend

* React
* Vite
* React Router
* JavaScript
* HTML
* CSS

## Backend

* Python
* Flask
* Flask-JWT-Extended
* Flask-SQLAlchemy
* SQLAlchemy
* PyMySQL
* Werkzeug

## Database

* MySQL

## Deployment

* GitHub Pages for the static frontend demo
* Flask + MySQL for conventional full-stack deployment

---

# Project Structure

```text
b2b-rfq-marketplace/
│
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── rfq.py
│   │   │   └── quotation.py
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── rfqs.py
│   │   │   └── quotations.py
│   │   │
│   │   └── utils/
│   │       └── auth.py
│   │
│   ├── .env.example
│   ├── requirements.txt
│   ├── schema.sql
│   └── run.py
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

# Frontend Architecture

The frontend uses a service-layer approach for API communication.

```text
React Components
       │
       ▼
    api.js
       │
       ├── VITE_API_BASE_URL configured
       │        │
       │        ▼
       │    Flask REST API
       │
       └── VITE_API_BASE_URL not configured
                │
                ▼
        Browser localStorage
```

## GitHub Pages Demo Mode

When `VITE_API_BASE_URL` is not configured, the frontend operates in a browser-only demo mode using `localStorage`.

This allows the GitHub Pages version to demonstrate:

* Buyer registration/login
* Supplier registration/login
* RFQ creation
* RFQ editing/deletion
* RFQ browsing
* Search and filtering
* Quotation submission
* Quotation history
* Validation
* UI-level authorization
* Deadline handling
* Loading states
* Empty states
* Error states

### Important Limitation

GitHub Pages only hosts static frontend files.

It does **not** run:

* Python
* Flask
* MySQL
* Server-side JWT validation
* Server-side database logic

Therefore, the GitHub Pages demo should be understood as a **client-side demonstration mode**, not as a production server deployment.

The repository also contains the real Flask + MySQL backend for environments that support server-side execution.

---

# Backend Architecture

```text
React Frontend
      │
      ▼
  REST API
      │
      ▼
Flask Routes
      │
      ├── Authentication
      │
      ├── Role Authorization
      │
      ├── Validation
      │
      └── Ownership Checks
      │
      ▼
SQLAlchemy Models
      │
      ▼
   MySQL
```

---

# Database Model

The application uses three main tables:

```text
users
   1
   │
   ├──────────────< rfqs
   │
   └──────────────< quotations

rfqs
   1
   │
   └──────────────< quotations
```

## Main Tables

### `users`

Stores application users and their roles.

Typical roles:

```text
BUYER
SUPPLIER
ADMIN
```

### `rfqs`

Stores buyer procurement requests.

Important fields include:

* Buyer ID
* Product/service name
* Description
* Quantity
* Delivery location
* Deadline
* Status
* Created timestamp

### `quotations`

Stores supplier responses to RFQs.

Important fields include:

* RFQ ID
* Supplier ID
* Quoted price
* Estimated delivery days
* Message
* Created timestamp

A database-level unique constraint on:

```text
(rfq_id, supplier_id)
```

prevents the same supplier from submitting multiple quotations for the same RFQ.

---

# RFQ Status Handling

RFQs have a lifecycle based on their deadline.

```text
OPEN
  │
  │ deadline passes
  ▼
CLOSED
```

Expired RFQs are treated as closed.

The backend exposes an admin endpoint for persisting expired RFQ status changes:

```text
POST /api/rfqs/expire
```

The application also prevents suppliers from submitting quotations to closed or expired RFQs.

---

# API Endpoints

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

## Public RFQ Endpoints

```text
GET /api/rfqs
GET /api/rfqs/<id>
```

Optional RFQ listing filters include:

```text
?search=
?location=
?status=OPEN
?status=CLOSED
```

Example:

```text
GET /api/rfqs?search=laptop&location=Hyderabad&status=OPEN
```

## Buyer Endpoints

```text
POST   /api/rfqs
PUT    /api/rfqs/<id>
DELETE /api/rfqs/<id>
GET    /api/buyer/rfqs
```

Buyer authorization ensures that a buyer can only modify or delete their own RFQs.

## Supplier Endpoints

```text
POST /api/rfqs/<id>/quotations
GET  /api/supplier/quotations
```

Suppliers cannot:

* Quote on their own RFQs
* Submit duplicate quotations
* Submit quotations after an RFQ is closed or expired

## Buyer Quotation Endpoint

```text
GET /api/rfqs/<id>/quotations
```

Only the buyer who owns the RFQ can view its quotations.

## Admin Endpoint

```text
POST /api/rfqs/expire
```

Used to persistently close expired RFQs.

---

# Validation

## RFQ Validation

The backend validates:

* Product/service name length
* Description length
* Quantity greater than zero
* Delivery location
* Valid ISO date format
* Future deadline

## Quotation Validation

The backend validates:

* Valid quoted price
* Positive quoted price
* Positive estimated delivery time
* Message length
* RFQ availability
* Supplier/RFQ ownership rules
* Duplicate quotation prevention

---

# Security

The backend includes:

* Password hashing with Werkzeug
* JWT authentication
* Role-based authorization
* Protected Buyer routes
* Protected Supplier routes
* Protected Admin operations
* Resource ownership validation
* Duplicate quotation protection
* Environment-based secrets
* Backend input validation

Sensitive configuration such as database credentials and JWT secrets should be supplied through environment variables and should not be committed to Git.

---

# Demo Accounts

For the frontend demo mode, the following demo accounts can be used:

### Buyer

```text
Email: buyer@demo.com
Password: Buyer@123
```

### Supplier

```text
Email: supplier@demo.com
Password: Supplier@123
```

These accounts are intended for demonstration/testing purposes.

---

# Run Frontend Locally

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The production output is generated in:

```text
frontend/dist
```

---

# Frontend Environment Configuration

By default, the frontend can run in localStorage demo mode.

To connect it to the real Flask API, configure:

```text
frontend/.env.production
```

Example:

```env
VITE_API_BASE_URL=https://YOUR-BACKEND-DOMAIN
```

Then rebuild:

```bash
npm run build
```

When `VITE_API_BASE_URL` is configured, the frontend uses the real REST API instead of browser-local persistence.

---

# Run Backend Locally

## 1. Create the MySQL database

Run:

```text
backend/schema.sql
```

using MySQL, or create the required database manually.

## 2. Create a virtual environment

### Windows

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
```

### Linux / macOS

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
```

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 4. Configure environment variables

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

Configure:

* Database host
* Database port
* Database name
* Database username
* Database password
* JWT secret
* CORS settings

Do not commit `.env` to Git.

## 5. Start the Flask API

```bash
python run.py
```

Health check:

```text
http://127.0.0.1:5000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "rfq-api"
}
```

---

# GitHub Pages Deployment

The frontend can be deployed through GitHub Actions.

Basic deployment flow:

```text
Git Push
   │
   ▼
GitHub Actions
   │
   ├── Install Node dependencies
   ├── Build React/Vite application
   └── Deploy frontend/dist
              │
              ▼
        GitHub Pages
```

Because the frontend uses `HashRouter`, static GitHub Pages hosting does not require server-side rewrite rules for client-side routes.

Typical URL:

```text
https://YOUR_USERNAME.github.io/b2b-rfq-marketplace/
```

---

# GitHub Actions

The frontend CI workflow installs dependencies using the committed npm lockfile and builds the application.

The repository should contain:

```text
frontend/package.json
frontend/package-lock.json
```

The lockfile should be generated by npm and committed to Git so that CI can reliably execute:

```bash
npm ci
npm run build
```

---

# API Health Check

Once the backend is running:

```text
GET /api/health
```

Example:

```json
{
  "status": "ok",
  "service": "rfq-api"
}
```

---

# Assignment Assumptions

* One RFQ belongs to one Buyer.
* One Supplier can submit at most one quotation for each RFQ.
* Buyers can only edit and delete their own RFQs.
* Only the owner of an RFQ can view its quotations.
* Suppliers cannot quote on their own RFQs.
* Closed or expired RFQs cannot receive new quotations.
* RFQs are automatically treated as closed after their deadline.
* GitHub Pages mode uses browser-local persistence.
* GitHub Pages mode is not a server-side multi-user database.
* The Flask + MySQL backend provides the conventional full-stack implementation.

---

# Current Application Modes

## GitHub Pages Demo

```text
React
  ↓
api.js
  ↓
localStorage
```

Best suited for:

* Assignment demonstration
* UI testing
* Buyer flow demonstration
* Supplier flow demonstration
* Static hosting

## Full-Stack Mode

```text
React
  ↓
Flask REST API
  ↓
SQLAlchemy
  ↓
MySQL
```

Best suited for:

* Real backend execution
* Multi-user applications
* Persistent server-side data
* JWT authentication
* Backend authorization
* Database-backed workflows

---

# AI Usage

AI tools may be used as development assistance for:

* Project scaffolding
* Debugging
* Documentation
* Code review
* Development productivity

All submitted code should be reviewed and understood by the developer.

The developer should be prepared to explain:

* Frontend architecture
* REST API design
* JWT authentication
* Role-based authorization
* Ownership checks
* RFQ lifecycle
* Quotation workflow
* Database relationships
* Validation rules
* GitHub Pages demo limitations
* Flask/MySQL deployment architecture

---

# Project Goal

The project demonstrates a complete mini B2B procurement workflow:

```text
Buyer creates RFQ
        ↓
RFQ becomes available to suppliers
        ↓
Supplier searches and reviews RFQ
        ↓
Supplier submits quotation
        ↓
Buyer reviews received quotations
        ↓
RFQ reaches deadline
        ↓
RFQ closes
```

The implementation combines a modern React frontend with a Flask REST API and MySQL persistence layer while also providing a static GitHub Pages demo mode for easy evaluation.

---

# License

This project was created for educational and software development assignment purposes.
