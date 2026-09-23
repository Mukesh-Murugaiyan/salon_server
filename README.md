# Salon ERP Backend — Production-Grade Multi-Tenant Architecture

This service is the core RESTful backend for the multi-tenant Salon ERP / CRM platform. Built with **Node.js, Express, MongoDB (Mongoose), and JWT**, it provides an enterprise-level architecture featuring **database-driven dynamic RBAC**, **strict multi-tenant isolation**, **subscription lifecycle & quota enforcement**, **conflict-free appointment scheduling**, and **server-authoritative GPS geo-fencing**.

---

## 1. End-to-End System Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │                  CLIENT APPLICATIONS                   │
               └───────────────────────────┬────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    ▼                                             ▼
       ┌─────────────────────────┐                   ┌─────────────────────────┐
       │   Web Portal (React)    │                   │ Mobile App (Expo SDK 57)│
       │  - Dynamic Admin & ERP  │                   │  - Attendance Check-In  │
       │  - Interactive Matrix   │                   │  - Subscription Status  │
       │  - Reusable Modals/Tabs │                   │  - Today's Appointments │
       └────────────┬────────────┘                   └────────────┬────────────┘
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           │ HTTPS (Bearer JWT)
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           EXPRESS APPLICATION SERVICE (Port 5001)                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. GLOBAL MIDDLEWARES: Helmet, CORS, Express JSON Parser, Rate Limiting                │
│                                                                                         │
│ 2. AUTHENTICATION PIPELINE (`authenticate`):                                            │
│    - Verifies Bearer JWT signature and expiration.                                      │
│    - Loads active User, Company/Salon tenant, Role, and dynamic permissions from DB.   │
│    - Rejects inactive users or disabled companies with HTTP 403.                        │
│                                                                                         │
│ 3. DYNAMIC AUTHORIZATION PIPELINE (`requirePermission(module, action)`):                │
│    - Validates `req.user.permissions.includes(`${module}:${action}`)`.                  │
│    - Zero hardcoded roles; 100% database-driven permission checks.                      │
│                                                                                         │
│ 4. SUBSCRIPTION GATING PIPELINE (`enforceSubscription`):                                │
│    - Verifies salon subscription status is `ACTIVE` and endDate >= now.                 │
│    - Rejects expired operations with exact HTTP 403 `SUBSCRIPTION_EXPIRED`.             │
│    - Enforces quota constraints (`maxStaff`, `maxAppointments`).                        │
│                                                                                         │
│ 5. CONTROLLER LAYER:                                                                    │
│    - AuthController        - SalonsController      - RolesController                    │
│    - UsersController       - ClientsController     - StaffController                    │
│    - ServicesController    - AppointmentsController - AttendanceController               │
│    - PlansController       - SubscriptionController - DashboardController                │
└──────────────────────────────────────────┬──────────────────────────────────────────────┘
                                           │ Mongoose ODM
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              MONGODB DATABASE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│ • companies (Salons)  • roles             • users          • permissions               │
│ • clients             • staff             • services       • appointments              │
│ • plans               • subscriptions     • subscription_audits • attendance           │
│                                                                                         │
│ INVARIANTS & INDEXES:                                                                  │
│ - Compound Unique Index on Attendance: `{ companyId: 1, userId: 1, date: 1 }`          │
│ - Compound Unique Index on Client: `{ companyId: 1, phone: 1 }`                        │
│ - Unique Index on User Email: `{ email: 1 }`                                           │
│ - Server-enforced soft-delete (`isActive: false`) and tenant scoping (`companyId`)     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. End-to-End Multi-Tenant Provisioning & Operational Flow

```text
                    ┌──────────────────────────┐
                    │  1. SUPER ADMIN USER     │
                    │  Create / Seed Admin     │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  2. CREATE PLANS         │
                    │  • Basic                 │
                    │  • Professional          │
                    └────────────┬─────────────┘
                                 │
                                 ▼
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
   ┌─────────────────────┐              ┌─────────────────────┐
   │      3. SALON A     │              │      4. SALON B     │
   │   Create Salon      │              │   Create Salon      │
   └──────────┬──────────┘              └──────────┬──────────┘
              │                                     │
              ▼                                     ▼
   ┌─────────────────────┐              ┌─────────────────────┐
   │ Assign Subscription │              │ Assign Subscription │
   │      to Salon A     │              │      to Salon B     │
   └──────────┬──────────┘              └──────────┬──────────┘
              │                                     │
              └──────────────────┬──────────────────┘
                                 ▼
                    ┌──────────────────────────┐
                    │  5. CREATE RBAC ROLES    │
                    │                          │
                    │  • ADMIN                 │
                    │  • OWNER                 │
                    │  • RECEPTIONIST          │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  6. CREATE USERS         │
                    │                          │
                    │  Salon A                 │
                    │  ├─ Owner                │
                    │  └─ Receptionist         │
                    │                          │
                    │  Salon B                 │
                    │  ├─ Owner                │
                    │  └─ Receptionist         │
                    └────────────┬─────────────┘
                                 │
                                 ▼
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
   ┌─────────────────────┐              ┌─────────────────────┐
   │   7. SALON A OWNER  │              │   8. SALON B OWNER  │
   │                     │              │                     │
   │ Create Services     │              │ Create Services     │
   │ Create Staff        │              │ Create Staff        │
   └──────────┬──────────┘              └─────────────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │ 9. SALON A RECEPTIONIST  │
   │                          │
   │ Create Clients           │
   │ Create Appointments      │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │ 10. MOBILE APP           │
   │                          │
   │ Login                    │
   │ View Today's Appointments│
   │ GPS Check-In             │
   │ Check-Out                │
   └────────────┬─────────────┘
                │
                ▼
   ┌──────────────────────────┐
   │ 11. WEB ATTENDANCE       │
   │                          │
   │ View Attendance          │
   │ Delete Attendance        │
   └──────────────────────────┘
```

---

## 3. Architectural Deep Dive: How Components Work Together

### 1. Database Entity Hierarchy & Multi-Tenant Isolation
The data model implements strict tenant hierarchy:
```text
Company / Salon (Top-Level Tenant Root)
   ├── Role (Scoped strictly to Company)
   │     └── Dynamic Permissions Array (["users:view", "appointments:create", ...])
   ├── User (Belongs to Company + Assigned Role)
   ├── Clients, Staff, Services, Appointments, Attendance (Scoped strictly to Company)
   └── Subscription (Active Plan, Quota Counters, Cycle Dates)
```
- **Server-Authoritative Tenant Scoping**: Every tenant-scoped query automatically derives `companyId` from `req.user.companyId`. Parameters or JSON bodies attempting to inject a different `companyId` are completely ignored or rejected server-side.
- **Cross-Tenant Guard**: Entities belonging to another tenant (e.g. attempting to book an appointment with a client from another salon) fail with HTTP 404/403.

### 2. Authentication & Stateless JWT Lifecycle
1. **Login (`POST /api/v1/auth/login`)**: Validates credentials via `bcrypt.compare(password, user.passwordHash)`.
2. **Permission Hydration**: On authentication, the user's assigned `Role` is retrieved and its granular permissions array is attached to the user session.
3. **Session Resolution (`GET /api/v1/auth/me`)**: Both Web and Mobile hydrate their frontend authorization state from this endpoint, ensuring UI controls reflect live database permissions immediately.
4. **Account Invalidation**: If a user is deactivated (`isActive: false`), all subsequent requests immediately fail with HTTP 403 `ACCOUNT_DISABLED`.

### 3. Dynamic RBAC (Role-Based Access Control)
- **Zero Hardcoded Roles**: Authorization checks never query role names like `OWNER` or `RECEPTIONIST`. Instead, all endpoints check permissions:
  ```javascript
  router.post('/appointments', authenticate, requirePermission('appointments', 'create'), enforceSubscription, createAppointment);
  ```
- **Interactive Permission Matrix**: Administrators configure permissions per role through an interactive matrix. Changes save directly to MongoDB and take effect without restarting services or hardcoding permission arrays.

### 4. Subscription Lifecycle & Quota Management
- **Subscription States**: `ACTIVE`, `EXPIRED`, `TRIAL`, `CANCELLED`.
- **Gating Middleware (`enforceSubscription`)**:
  - Automatically intercepts mutations on operational resources (e.g. staff creation, appointment booking).
  - If a company's subscription has lapsed (`endDate < Date.now()` or status is `EXPIRED`), the request is blocked with HTTP 403:
    ```json
    {
      "error": "SUBSCRIPTION_EXPIRED",
      "message": "Your subscription has expired. Please contact the administrator to renew your plan."
    }
    ```
- **Plan Quota Limits**:
  - `maxStaff`: Verifies active staff count before allowing new staff registration (`400 PLAN_LIMIT_EXCEEDED`).
  - `maxAppointments`: Verifies monthly appointment count before booking (`400 PLAN_LIMIT_EXCEEDED`).
- **Audit Logging**: Every plan assignment, renewal, and upgrade is immutably logged to the `SubscriptionAudit` collection with timestamps and actor details.

### 5. Appointments & Conflict Scheduling Engine
- **Operating Hours Validation**: All bookings must fall strictly between `09:00` and `20:00`.
- **Dynamic Service Duration**: The appointment duration is automatically synchronized with `service.durationInMinutes`.
- **Concurrency & Overlap Conflict Protection**:
  - Prevents booking the same staff member for overlapping time intervals on the same date.
  - Queries existing active bookings (`CONFIRMED`, `PENDING`) using interval intersection:
    $$\max(\text{start}_1, \text{start}_2) < \min(\text{end}_1, \text{end}_2)$$
  - Returns HTTP 409 `Conflict` with exact conflict details if overlapping.
  - Cancelled appointments (`status = 'CANCELLED'`) do not block slots.

### 6. Geo-Fencing & Attendance Engine
- **Server-Side Haversine Verification**:
  Device GPS coordinates `(latitude, longitude)` are validated against the salon's configured coordinates using the spherical Haversine formula:
  $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
  *(where $R = 6,371,000\text{ m}$)*
- **Boundary & Exceeded Evaluation**:
  - Distance $\le$ `allowedRadiusInMeters`: Check-in succeeds (`200 OK`).
  - Distance > `allowedRadiusInMeters`: Rejected with HTTP 403 `OUT_OF_RANGE`, returning distance and exact exceeded amount (`exceededBy`).
- **Duplicate Check-In Prevention**:
  A MongoDB compound unique index `{ companyId: 1, userId: 1, date: 1 }` guarantees that an employee cannot check in multiple times on the same date (`400 DUPLICATE_CHECK_IN`).

---

## 4. Evaluator Test Credentials (Pre-Configured)

> **NOTE**: Dynamic accounts are already configured in the database. No seeds or demo scripts need to be run.

| Role | Email | Password | Scope & Access |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@salon.com` | `Password01*` | Full administrative access, tenant management, subscription tiers, dynamic permission matrix. |
| **Owner** | `owner@salona.com` | `Password01*` | Salon operations, staff management, client catalog, appointment scheduling, subscription renewals. |
| **Receptionist** | `receptionist@salona.com` | `Password01*` | Front-desk scheduling, client records, GPS attendance check-in, today's appointments. |

---

## 5. Setup & Running the Server

### Prerequisites
- Node.js (v18+)
- Local or Cloud MongoDB instance

### Installation & Execution
```bash
# Install dependencies
npm install

# Configure environment in .env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/salon_crm
JWT_SECRET=super_secure_and_long_jwt_secret_key_for_salon_crm_production_quality
JWT_EXPIRES_IN=1d
WEB_ORIGIN=http://localhost:5173

# Start development server
npm run dev

# Run in production mode
npm start
```

---

## 6. API Reference (v1)

### Authentication
- `POST /api/v1/auth/login` — Authenticate and receive JWT + user profile + permissions.
- `GET /api/v1/auth/me` — Resolve current authenticated session profile.
- `POST /api/v1/auth/logout` — Stateless logout.

### Roles & Permissions (`roles` module)
- `GET /api/v1/roles` (`roles:view`) — List company roles with active user counts.
- `POST /api/v1/roles` (`roles:create`) — Create new role.
- `GET /api/v1/roles/:id` (`roles:view`) — Get role details and assigned users.
- `PUT /api/v1/roles/:id` (`roles:update`) — Update role metadata.
- `DELETE /api/v1/roles/:id` (`roles:delete`) — Delete role (prevented if users are assigned).
- `GET /api/v1/roles/:id/permissions` (`roles:view`) — Get dynamic permissions matrix schema.
- `PUT /api/v1/roles/:id/permissions` (`roles:update`) — Persist modified permissions array in MongoDB.

### Users (`users` module)
- `GET /api/v1/users` (`users:view`) — List company users with search and pagination.
- `POST /api/v1/users` (`users:create`) — Create user assigned to a company role.
- `GET /api/v1/users/:id` (`users:view`) — Get user profile details.
- `PUT /api/v1/users/:id` (`users:update`) — Update user information or role.
- `PATCH /api/v1/users/:id/status` (`users:update`) — Toggle user active/disabled status.
- `DELETE /api/v1/users/:id` (`users:delete`) — Soft delete user.

### Clients (`clients` module)
- `GET /api/v1/clients` (`clients:view`) — List salon clients with search and gender filtering.
- `POST /api/v1/clients` (`clients:create`) — Create client (enforces unique phone per company).
- `GET /api/v1/clients/:id` (`clients:view`) — Get client details.
- `PUT /api/v1/clients/:id` (`clients:update`) — Update client profile.
- `DELETE /api/v1/clients/:id` (`clients:delete`) — Soft delete client.

### Staff (`staff` module)
- `GET /api/v1/staff` (`staff:view`) — List staff service providers with search and title filter.
- `POST /api/v1/staff` (`staff:create`) — Create staff member with specializations and job title.
- `GET /api/v1/staff/:id` (`staff:view`) — Get staff member details.
- `PUT /api/v1/staff/:id` (`staff:update`) — Update staff profile and specializations.
- `PATCH /api/v1/staff/:id/status` (`staff:update`) — Toggle staff active/inactive state.
- `DELETE /api/v1/staff/:id` (`staff:delete`) — Soft delete staff member.

### Services (`services` module)
- `GET /api/v1/services` (`services:view`) — List salon services with search and status filter.
- `POST /api/v1/services` (`services:create`) — Create service (positive duration, non-negative price, unique active name).
- `GET /api/v1/services/:id` (`services:view`) — Get service details.
- `PUT /api/v1/services/:id` (`services:update`) — Update service details.
- `PATCH /api/v1/services/:id/status` (`services:update`) — Toggle service active/inactive state.
- `DELETE /api/v1/services/:id` (`services:delete`) — Soft delete service.

### Appointments (`appointments` module)
- `GET /api/v1/appointments` (`appointments:view`) — List appointments with date, staff, client, and status filters.
- `POST /api/v1/appointments` (`appointments:create`) — Book appointment with overlap conflict detection and business hours check.
- `GET /api/v1/appointments/:id` (`appointments:view`) — Get populated appointment details.
- `PUT /api/v1/appointments/:id` (`appointments:update`) — Reschedule appointment with conflict validation.
- `PATCH /api/v1/appointments/:id/status` (`appointments:update`) — Update booking status (`CONFIRMED`, `PENDING`, `COMPLETED`, `CANCELLED`).
- `DELETE /api/v1/appointments/:id` (`appointments:delete`) — Cancel appointment.

### Subscription & Plans (`plans` & `subscription` modules)
- `GET /api/v1/plans` (`plans:view`) — List available subscription tiers.
- `POST /api/v1/plans` (`plans:create`) — Create plan with pricing, limits, and duration.
- `GET /api/v1/subscription` (`subscription:view`) — Get active company subscription and quota utilization.
- `POST /api/v1/subscription/assign` (`subscription:assign`) — Assign a plan to company.
- `POST /api/v1/subscription/renew` (`subscription:renew`) — Renew subscription for another cycle.
- `POST /api/v1/subscription/upgrade` (`subscription:upgrade`) — Upgrade or switch plan tier.
- `GET /api/v1/subscription/history` (`subscription:history`) — View immutable audit trail.

### Attendance & Geo-Fencing (`attendance` module)
- `POST /api/v1/attendance/check-in` (`attendance:check_in`) — Submit GPS coordinates for Haversine distance verification.
- `GET /api/v1/attendance/today` (`attendance:check_in`) — Get today's check-in status for authenticated user.
- `GET /api/v1/attendance` (`attendance:view`) — List company attendance records with date and user filter.
- `GET /api/v1/attendance/:id` (`attendance:view`) — Get single attendance record.
- `GET /api/v1/attendance/location` (authenticated) — Get salon geo-fence coordinates and allowed radius.
- `PUT /api/v1/attendance/location` (`companies:update`) — Configure salon geo-fence coordinates and radius.

---

## 7. Automated Test Suite (61 Tests Across 8 Suites)

Execute all integration and unit tests:
```bash
npm test
```

### Verified Test Suites:
1. `tests/auth.test.js` (10 tests): JWT generation, valid login, case-insensitive email, missing credentials, disabled user 403, session resolution.
2. `tests/geofencing.test.js` (11 tests): Haversine distance calculation, check-in inside allowed radius (200 OK), check-in outside radius (403 OUT_OF_RANGE), exact boundary case, duplicate check-in prevention (400 DUPLICATE_CHECK_IN), missing/invalid coordinates validation.
3. `tests/tenant.test.js` (6 tests): Cross-tenant query boundary protection, rejection of injected `companyId`, cross-company booking isolation.
4. `tests/rbac.test.js` (11 tests): Dynamic permission middleware enforcement, role creation, interactive permission matrix persistence.
5. `tests/services.test.js` (8 tests): Service CRUD, duration & price validation, duplicate active service name guard.
6. `tests/user.test.js` (8 tests): User CRUD, role assignment, status toggling.
7. `tests/seed.test.js` (4 tests): Seed database invariants.
8. `tests/versioning.test.js` (3 tests): API v1 versioning integrity.
