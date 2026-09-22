# Salon ERP — Multi-Tenant Architecture & Technical Foundation
## Ticket 1: Authentication & Authorization Foundation

This repository provides the core authentication, role-based access control (RBAC), and multi-tenant isolation foundation for the Salon CRM/ERP platform.

---

## 1. Project Setup & Prerequisites

### Architecture Overview
- **Backend Service (`salon_server`)**: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs.
- **Frontend Client (`salon_client_web`)**: React.js, Vite, Material UI (MUI), Axios, React Router.

### Prerequisites
- Node.js >= 18.x (tested on v25.8.x)
- npm >= 9.x
- MongoDB (local instance, MongoDB Atlas, or built-in zero-config in-memory runner for quick evaluation)

### Installation
```bash
# 1. Install Backend Dependencies
cd /Users/sush/Projects/Salon-ERP-App/salon_server
npm install

# 2. Install Frontend Dependencies
cd /Users/sush/Projects/Salon-ERP-App/salon_client_web
npm install
```

---

## 2. Environment Variables

### Backend Configuration (`salon_server/.env`)
Copy the provided `.env.example` to `.env`:
```bash
cp .env.example .env
```

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/salon_crm
JWT_SECRET=super_secure_and_long_jwt_secret_key_for_salon_crm_production_quality
JWT_EXPIRES_IN=1d
WEB_ORIGIN=http://localhost:5173
```

### Frontend Configuration (`salon_client_web/.env`)
```bash
cp .env.example .env
```

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 3. MongoDB Setup

You can connect to MongoDB in any of the following modes:

1. **Local MongoDB Instance**:
   Run MongoDB on default port `27017` with database name `salon_crm`.
2. **MongoDB Atlas URI**:
   Set `MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/salon_crm` in `.env`.
3. **Zero-Config Embedded Evaluation Mode**:
   Set `USE_MEMORY_DB=true` in `.env` or run:
   ```bash
   USE_MEMORY_DB=true npm run dev
   ```
   This spins up an in-memory MongoDB instance automatically without requiring any native MongoDB installation on the host machine.

---

## 4. Database Seeding

The database seed script is **strictly idempotent**. Running it multiple times updates existing entities without creating duplicate records or orphan ObjectIds.

```bash
# In salon_server directory:
npm run seed

# Or with zero-config in-memory MongoDB:
USE_MEMORY_DB=true npm run seed
```

---

## 5. Development Credentials

> [!WARNING]
> The seeded credentials below are strictly for local development and technical assessment review. **Never use these passwords in production.**

| Role | Name | Email | Password | Assigned Tenant (`salonId`) |
| :--- | :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | Platform Super Admin | `admin@saloncrm.com` | `Admin@123` | `null` (Global Platform Admin) |
| **OWNER** | Salon Owner | `owner@saloncrm.com` | `Owner@123` | Demo Salon (`Luxe Haven Salon & Spa`) |
| **RECEPTIONIST**| Front Desk Receptionist | `receptionist@saloncrm.com`| `Receptionist@123`| Demo Salon (`Luxe Haven Salon & Spa`) |
| **OWNER (Locked)**| Disabled Account User | `disabled@saloncrm.com` | `Disabled@123` | Demo Salon (isActive: `false`) |

---

## 6. Running the Applications

### Start Backend
```bash
cd /Users/sush/Projects/Salon-ERP-App/salon_server
npm run dev
# Running on http://localhost:5000
```

### Start Frontend
```bash
cd /Users/sush/Projects/Salon-ERP-App/salon_client_web
npm run dev
# Running on http://localhost:5173
```

---

## 7. API Endpoints Reference (Version 1 — `/api/v1`)

### Health Check
- **`GET /api/v1/health`**
  - Response `200 OK`: `{"status": "ok"}`

### Authentication
- **`POST /api/v1/auth/login`**
  - **Request Body**:
    ```json
    {
      "email": "owner@saloncrm.com",
      "password": "Owner@123"
    }
    ```
  - **Success Response `200 OK`**:
    ```json
    {
      "user": {
        "id": "6791...a1",
        "name": "Salon Owner",
        "email": "owner@saloncrm.com",
        "role": "OWNER",
        "salonId": "6791...f0"
      },
      "token": "eyJhbGciOi..."
    }
    ```
  - **Error Responses**:
    - `400 Bad Request`: `{"error": "VALIDATION_ERROR", "message": "Email and password are required."}`
    - `401 Unauthorized`: `{"error": "INVALID_CREDENTIALS", "message": "Invalid email or password."}`
    - `403 Forbidden`: `{"error": "ACCOUNT_DISABLED", "message": "Your account is disabled. Please contact the administrator."}`

- **`GET /api/v1/auth/me`** *(Protected)*
  - **Header**: `Authorization: Bearer <token>`
  - **Success Response `200 OK`**:
    ```json
    {
      "user": {
        "id": "6791...a1",
        "name": "Salon Owner",
        "email": "owner@saloncrm.com",
        "role": "OWNER",
        "salonId": "6791...f0"
      }
    }
    ```

- **`POST /api/v1/auth/logout`** *(Protected)*
  - **Header**: `Authorization: Bearer <token>`
  - **Success Response `200 OK`**: `{"message": "Logged out successfully."}`

### User Management
- **`GET /api/v1/users`** *(Protected — Scoped by tenant for salon roles)*
- **`GET /api/v1/users/:id`** *(Protected)*
- **`POST /api/v1/users`** *(Protected — OWNER provisions staff; SUPER_ADMIN provisions all)*
- **`PATCH /api/v1/users/:id`** *(Protected)*
- **`PATCH /api/v1/users/:id/status`** *(Protected — Enable/disable user)*

---

## 8. Role-Based Access Control (RBAC) Matrix

| Module / Action | SUPER_ADMIN | OWNER | RECEPTIONIST |
| :--- | :---: | :---: | :---: |
| **Login** | ✅ YES | ✅ YES | ✅ YES |
| **Platform Overview (`/admin`)** | ✅ YES | ❌ NO | ❌ NO |
| **Salon Dashboard (`/dashboard`)** | ✅ YES | ✅ YES | ✅ YES |
| **Plans Management** | ✅ YES | ❌ NO | ❌ NO |
| **Salons Management** | ✅ YES | ❌ NO | ❌ NO |
| **Subscription Management** | ✅ YES | ❌ NO (Future) | ❌ NO |
| **Subscription View** | ✅ YES | ✅ YES | ❌ NO |
| **Appointments** | ✅ YES | ✅ YES | ✅ YES |
| **Clients** | ✅ YES | ✅ YES | ✅ YES |

---

## 9. Multi-Tenancy & Zero-Trust Isolation Architecture

### Core Tenant Principle
> **The client is NEVER trusted to specify its tenant context.**

1. For salon-scoped users (`OWNER` and `RECEPTIONIST`), `req.user.salonId` originates strictly from the verified JWT / database user entity.
2. The helper `getSalonIdFromUser(req)`:
   - For `OWNER` & `RECEPTIONIST`: returns `req.user.salonId`
   - For `SUPER_ADMIN`: returns `null`
3. If an attacker submits `{ "salonId": "ATTACKER_TENANT_ID" }` in `req.body`, `req.query`, or `req.params`, backend controllers ignore it completely and use `req.user.salonId`.
4. This guarantee is verified in `tests/tenant.test.js`.

---

## 10. Security Architecture & Hardening

1. **Password Hashing**:
   - `bcryptjs` with **12 salt rounds**.
   - `passwordHash` has `select: false` in the schema and is stripped by `toSafeUser(user)`.
2. **Stateless JWT with Database Liveness Checks**:
   - JWT payload contains only `{ userId, role, salonId }`. No passwords, hashes, personal data, or subscription state.
   - The `authenticate` middleware inspects the database to guarantee the user account exists and `isActive === true`. Disabling an account immediately revokes access even before the JWT expires.
3. **Email Normalization**:
   - Sanitized via `email.trim().toLowerCase()` to prevent case sensitivity or whitespace enumeration attacks.
4. **Account Enumeration Prevention**:
   - Unknown emails and incorrect passwords return the identical `401 INVALID_CREDENTIALS` error.
5. **Session Storage Trade-Offs**:
   - Client tokens are isolated behind `src/utils/storage.js`.
   - localStorage is used for assessment simplicity; the abstraction allows seamless replacement with HttpOnly cookies with CSRF protection for enterprise environments.
6. **Backend Is Authoritative**:
   - Frontend `ProtectedRoute` and `RoleRoute` provide UX guidance; backend `authenticate` and `authorizeRoles` middlewares provide tamper-proof authorization.

---

## 11. Automated Test Suite

### Running Backend Tests
```bash
cd /Users/sush/Projects/Salon-ERP-App/salon_server
npm test
```
- **30 Tests Passed (4 Test Suites)**:
  - `tests/auth.test.js`: Login edge cases, whitespace, uppercase, invalid credentials, disabled account, token expiration, user deletion/disablement.
  - `tests/rbac.test.js`: Role access gates across all endpoints.
  - `tests/tenant.test.js`: Strict tenant isolation and body tampering resistance.
  - `tests/seed.test.js`: Idempotency and user count integrity.

### Running Frontend Tests
```bash
cd /Users/sush/Projects/Salon-ERP-App/salon_client_web
npm test
```
- **12 Tests Passed (3 Test Suites)**:
  - `src/test/Login.test.jsx`: Rendering, validations, disablement, error banners.
  - `src/test/navigation.test.jsx`: Role-specific nav filtering and default route redirection.
  - `src/test/storage.test.jsx`: Storage abstraction layer.
