# Salon ERP — Multi-Tenant Dynamic RBAC Architecture
## Ticket 3: Dynamic Company, Role, User & Permission Management

This repository provides the core backend service for the multi-tenant Salon CRM/ERP platform. Under **Ticket 3**, the system has transitioned from hardcoded role archetypes to a 100% database-driven entity hierarchy.

---

## 1. Architectural Entity Hierarchy

```text
Company (Top-Level Tenant)
   ↓
 Role   (Scoped strictly to Company)
   ↓
 User   (Belongs to Company + Assigned Role)
   ↓
Role Permissions (Dynamic Module + Action pairs)
   ↓
Features / Navigation / Server-Side APIs
```

### Key Principles:
1. **Zero Hardcoded Roles**: No hardcoded roles exist in authorization checks or system logic.
2. **Zero Hardcoded Users**: All users exist solely as database records.
3. **Server-Authoritative Tenant Isolation**: Every tenant query uses `req.user.companyId`. Parameters or body values attempting to specify another company are rejected or overridden server-side.
4. **Dynamic Permission Validation**: Access is checked via `requirePermission(module, action)` middleware against the authenticated user's populated permissions array in MongoDB.

---

## 2. Project Setup & Prerequisites

### Architecture
- **Backend Service (`salon_server`)**: Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs.
- **Port**: Default configured to `5001` (to prevent conflict with macOS AirPlay / ControlCenter on port 5000).

### Installation
```bash
cd salon_server
npm install
```

### Environment Configuration (`salon_server/.env`)
```env
NODE_ENV=development
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=super_secure_and_long_jwt_secret_key_for_salon_crm_production_quality
JWT_EXPIRES_IN=1d
WEB_ORIGIN=http://localhost:5173

```

### Evaluator Test Credentials (Pre-Configured)
The following dynamic accounts are configured in the database:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@salon.com` | `Password01*` | Full system administration |
| **Owner** | `ownera@salon.com` | `Password01*` | Salon management & operations |
| **Receptionist** | `receptionista@salon.com` | `Password01*` | Front-desk scheduling & attendance |

---

## 3. Initial Seed Execution

The seed execution order strictly creates:
```text
1. Create Company (Demo Company / DEMO)
        ↓
2. Create Role for that Company (Super Admin with full dynamic permissions)
        ↓
3. Create Super Admin User referencing Company + Role
```

Run seed:
```bash
npm run seed
```

Result: Only 1 Company, 1 Role, and 1 User are created. No dummy Owner, Receptionist, or unnecessary demo entities.

---

## 4. API Endpoints (v1)

### Authentication
- `POST /api/v1/auth/login` — Authenticate and load Company + Role + dynamic Permissions.
- `GET /api/v1/auth/me` — Resolve authenticated session profile.
- `POST /api/v1/auth/logout` — Stateless logout.

### Role Management (`roles` module)
- `GET /api/v1/roles` (`roles:view`) — List company roles with live assigned user counts.
- `POST /api/v1/roles` (`roles:create`) — Create new company role.
- `GET /api/v1/roles/:id` (`roles:view`) — Retrieve role details and assigned users.
- `PUT /api/v1/roles/:id` (`roles:update`) — Update role metadata.
- `DELETE /api/v1/roles/:id` (`roles:delete`) — Delete role (prevented if users are assigned).
- `GET /api/v1/roles/:id/permissions` (`roles:view`) — Get role permissions and UI matrix schema.
- `PUT /api/v1/roles/:id/permissions` (`roles:update`) — Update permissions array in MongoDB.

### User Management (`users` module)
- `GET /api/v1/users` (`users:view`) — List users within authenticated company.
- `POST /api/v1/users` (`users:create`) — Create user assigned to a company role.
- `GET /api/v1/users/:id` (`users:view`) — Get single user within company.
- `PUT /api/v1/users/:id` (`users:update`) — Update user details or role.
- `PATCH /api/v1/users/:id/status` (`users:update`) — Toggle active/inactive status.
- `DELETE /api/v1/users/:id` (`users:delete`) — Deactivate user account.

### Dynamic Dashboard (`dashboard` module)
- `GET /api/v1/dashboard/summary` (`dashboard:view`) — Live operational metrics scoped to company.

### Client Management (`clients` module) — Ticket 4
- `GET /api/v1/clients` (`clients:view`) — List clients scoped to company with search and pagination.
- `POST /api/v1/clients` (`clients:create`) — Create new client. Enforces unique phone per company.
- `GET /api/v1/clients/:id` (`clients:view`) — Get single client by ID.
- `PUT /api/v1/clients/:id` (`clients:update`) — Update client profile details.
- `DELETE /api/v1/clients/:id` (`clients:delete`) — Soft delete client (`isActive = false`).

### Staff Management (`staff` module) — Ticket 5
- `GET /api/v1/staff` (`staff:view`) — List salon staff scoped to company with search, role/title, and status filter.
- `POST /api/v1/staff` (`staff:create`) — Create staff member (stylist, barber, colorist, etc.). Enforces unique phone per company.
- `GET /api/v1/staff/:id` (`staff:view`) — Get staff member details by ID.
- `PUT /api/v1/staff/:id` (`staff:update`) — Update staff member profile and specializations.
- `PATCH /api/v1/staff/:id/status` (`staff:update`) — Toggle active/inactive status.
- `DELETE /api/v1/staff/:id` (`staff:delete`) — Soft delete staff member (`isActive = false`).

> **Architectural Note (Staff vs User)**: Staff members represent salon service providers (stylists, barbers, therapists, etc.) who deliver services. They are intentionally kept separate from `User` entities, which represent system login accounts. A staff member does NOT automatically have login access.

### Service Management (`services` module) — Ticket 6
- `GET /api/v1/services` (`services:view`) — List salon services scoped to company with search and status filter.
- `POST /api/v1/services` (`services:create`) — Create new service. Enforces unique active service name per company, positive duration, and non-negative price.
- `GET /api/v1/services/:id` (`services:view`) — Get single service details by ID.
- `PUT /api/v1/services/:id` (`services:update`) — Update service details, duration, and pricing.
- `PATCH /api/v1/services/:id/status` (`services:update`) — Toggle active/inactive service status.
- `DELETE /api/v1/services/:id` (`services:delete`) — Soft delete service (`isActive = false`).

> **Architectural Note (Database-Driven Services)**: No service names or durations (e.g. Haircut, Facial, Hair Color) are hardcoded in the codebase. Every service is completely database-driven and isolated to its owning Company tenant.

### Appointment Management (`appointments` module) — Ticket 7
- `GET /api/v1/appointments` (`appointments:view`) — List appointments scoped to company with date, staff, client, and status filters.
- `POST /api/v1/appointments` (`appointments:create`) — Book new appointment. Enforces:
  - Cross-entity ownership: Client, Staff, and Service must all belong to authenticated company and be active.
  - Business hours validation (strictly between 09:00 and 20:00).
  - Database-driven duration: Appointment duration is strictly validated against `service.durationInMinutes`.
  - Staff overlap protection: Same staff cannot have overlapping active bookings on the same date (`409 Conflict`).
  - Cancelled appointments do NOT block slots.
- `GET /api/v1/appointments/:id` (`appointments:view`) — Get single appointment details with populated client, staff, and service.
- `PUT /api/v1/appointments/:id` (`appointments:update`) — Reschedule or update appointment details with overlap validation.
- `PATCH /api/v1/appointments/:id/status` (`appointments:update`) — Update appointment status (`PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`).
- `DELETE /api/v1/appointments/:id` (`appointments:delete`) — Cancel appointment (`status = 'CANCELLED'`).

### Plan Management (`plans` module) — Ticket 8
- `GET /api/v1/plans` (`plans:view`) — List all subscription plans.
- `POST /api/v1/plans` (`plans:create`) — Create new subscription plan with name, price, durationInDays, maxStaff, and maxAppointments.
- `GET /api/v1/plans/:id` (`plans:view`) — Get single plan details.
- `PUT /api/v1/plans/:id` (`plans:update`) — Update plan attributes, limits, and pricing.
- `DELETE /api/v1/plans/:id` (`plans:delete`) — Deactivate / soft delete plan.

### Subscription Management (`subscription` module) — Ticket 8
- `GET /api/v1/subscription` (`subscription:view`) — Retrieve active company subscription, plan limits, remaining days, and live quota usage.
- `POST /api/v1/subscription/assign` (`subscription:assign`) — Assign a plan to the authenticated company (creates audit history).
- `POST /api/v1/subscription/renew` (`subscription:renew`) — Renew current subscription for another cycle (creates audit history).
- `POST /api/v1/subscription/upgrade` (`subscription:upgrade`) — Upgrade / switch to another plan tier (creates audit history).
- `GET /api/v1/subscription/history` (`subscription:history`) — Retrieve company subscription audit history trail.

> **Subscription Enforcement Invariant**: When a salon company subscription expires or is unassigned, subscription-gated APIs return HTTP 403 with exact JSON:
```json
{
  "error": "SUBSCRIPTION_EXPIRED",
  "message": "Your subscription has expired. Please contact the administrator to renew your plan."
}
```
> Plan limits (`maxStaff`, `maxAppointments`) are strictly enforced server-side. Attempts to exceed plan limits return HTTP 400 with `error: "PLAN_LIMIT_EXCEEDED"`.

### Attendance & Geo-Fencing (`attendance` module) — Ticket 9
- `POST /api/v1/attendance/check-in` (`attendance:check_in`) — Submit GPS coordinates (`latitude`, `longitude`). Distance to salon is verified server-side via Haversine formula.
- `GET /api/v1/attendance/today` (`attendance:check_in`) — Retrieve current user's check-in status for today (`hasCheckedIn: boolean`).
- `GET /api/v1/attendance` (`attendance:view`) — List company attendance records with pagination, date, and user filtering.
- `GET /api/v1/attendance/:id` (`attendance:view`) — Retrieve single attendance record strictly within tenant context.
- `GET /api/v1/attendance/location` (authenticated) — Retrieve salon geo-fence coordinates (`latitude`, `longitude`, `allowedRadiusInMeters`).
- `PUT /api/v1/attendance/location` (`companies:update`) — Update salon geo-fence coordinates and permitted radius.

> **Geo-Fencing Invariant**: If distance from salon coordinates exceeds `allowedRadiusInMeters`, the API returns HTTP 403:
```json
{
  "error": "OUT_OF_RANGE",
  "message": "You are outside the permitted salon radius for check-in."
}
```
> **Duplicate Check-In Invariant**: Compound unique index `{ companyId: 1, userId: 1, date: 1 }` prevents multiple check-ins on the same day (`400 DUPLICATE_CHECK_IN`). Missing/invalid coordinates return `400 VALIDATION_ERROR`.

---

## 5. Security & Isolation Invariants

- **Multi-Tenant Boundaries**: `req.user.companyId` is derived exclusively from the verified JWT and populated active database record. Request body or query parameters specifying `companyId` are ignored/overridden.
- **Permission Middleware**: `requirePermission(module, action)` evaluates `req.user.permissions.includes(`${module}:${action}`)`.
- **Account Inactivity Checks**: Suspended users or inactive companies/roles receive immediate `403` responses.

