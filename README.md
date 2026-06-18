# Production-Ready Authentication & Authorization Microservice

A modular REST API and developer control console built using Node.js, Express, PostgreSQL, Prisma ORM, Redis, and Next.js.

This repository is structured exactly like a real-world enterprise developer tool. The dashboard utilizes a clean, high-fidelity light-theme developer aesthetic (similar to Stripe, Supabase, and GitHub) that avoids typical AI-generated tropes (dark gradients, neon glow effects, and oversized cards).

---

## Technical Architecture

```
                                +-------------------+
                                | Next.js Dashboard |
                                |   (Port 3001)     |
                                +---------+---------+
                                          | Fetch Requests
                                          v
                                +-------------------+
                                |    Express API    |
                                |   (Port 3000)     |
                                +----+----+----+----+
                                     |    |    |
                   +-----------------+    |    +-----------------+
                   |                      |                      |
                   v                      v                      v
          +-----------------+    +-----------------+    +-----------------+
          |  PostgreSQL DB  |    |  Prisma Client  |    |  Redis Session  |
          |  (Port 5433)    |    |    (ORM)        |    |  Blacklist/TTL  |
          +-----------------+    +-----------------+    +-----------------+
```

### Key Security & Core Features
- **Stateless/Stateful Dual-Token Auth**:
  - **Access Token**: Short-lived (15m), state-independent verification.
  - **Refresh Token**: Long-lived (7d), registered in PostgreSQL to track active browser sessions.
- **Atomic Token Rotation (Refresh)**: Exchanging a refresh token invalidates and deletes the old one while issuing a fresh pair. Re-submitting an old refresh token returns `401 Unauthorized` and deletes the active session to prevent token replay hijacking.
- **Express-to-Redis Blacklisting**: On logout, access tokens are cached in Redis with a TTL matching their remaining lifespan, immediately revoking access globally.
- **Strict Content Security Policies (CSP)**: Secured via `helmet()` middleware. Frontend scripts are completely decoupled from HTML files to prevent cross-site scripting (XSS) risks.
- **Role-Based Access Control (RBAC)**: Role validation middleware guarding specific developer operations (e.g. `/users/admin/users`).
- **Database Seeding**: On start, the system automatically creates a default Admin user if none exists.

---

## Tech Stack
- **Backend API**: Node.js · Express.js · PostgreSQL · Prisma ORM · Redis (`ioredis`) · JWT · BcryptJS
- **Frontend Console**: Next.js (App Router) · React · TypeScript · Tailwind CSS · Lucide Icons
- **Infrastructure**: Docker & Docker Compose

---

## Repository Structure

```
auth-microservice/
├── dashboard/                 # Next.js Frontend App
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css    # Tailwind styles & theme variables
│   │   │   ├── layout.tsx     # Next.js root layout
│   │   │   └── page.tsx       # Main developer dashboard UI
│   │   └── lib/
│   │       └── api.ts         # TypeScript API Client with automatic token refresh
│   ├── package.json
│   └── tsconfig.json
├── prisma/
│   ├── migrations/
│   └── schema.prisma          # Database models (User, Session, Role)
├── src/                       # Backend Express Service
│   ├── config/
│   │   ├── db.js              # Prisma Client connection pool
│   │   ├── redis.js           # Redis client setup
│   │   └── seed.js            # Default Admin account seeder
│   ├── controllers/
│   │   └── auth.controller.js # Authentication logical controllers
│   ├── middleware/
│   │   ├── auth.middleware.js # JWT validation & Redis blacklist check
│   │   ├── rateLimiter.js     # Rate limiting (brute-force protection)
│   │   └── rbac.middleware.js # Role based authorization
│   ├── routes/
│   │   ├── auth.routes.js     # Auth routing
│   │   └── user.routes.js     # User & admin profile endpoints
│   └── app.js                 # App configuration and bootstrapper
├── docker-compose.yml
├── Dockerfile
├── test-endpoints.js          # E2E Backend test harness
├── promote-admin.js           # CLI script to grant admin privileges
├── .env.example
└── README.md
```

---

## Default Admin Credentials

Upon launching the Express API, the database seeder automatically ensures a default administrator exists:
- **Email**: `admin@test.com`
- **Password**: `AdminPassword@1234`

*The Next.js dashboard login form is pre-filled with these credentials by default so you can sign in with a single click and test the Admin user table.*

---

## Getting Started

### 1. Setup Environment
1. Copy the example `.env` file in the root:
   ```bash
   cp .env.example .env
   ```
2. Generate secure JWT secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Run this command twice and update `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` in `.env`.

---

### 2. Run the Application

#### Option A: Run Locally (Recommended for Development)

1. **Start the Infrastructure (PostgreSQL & Redis)**:
   ```bash
   docker compose up db redis -d
   ```
   *Note: PostgreSQL is mapped to host port `5433` and Redis is mapped to `6380` to avoid conflicts with local installations.*

2. **Run Migrations & Seeding**:
   Install backend dependencies and update the schema:
   ```bash
   npm install
   npx prisma migrate dev --name init
   ```

3. **Start the Backend API (Port 3000)**:
   ```bash
   npm run dev
   ```

4. **Start the Next.js Dashboard (Port 3001)**:
   Open a new terminal window:
   ```bash
   cd dashboard
   npm install
   npm run dev -- -p 3001
   ```
   Open [http://localhost:3001](http://localhost:3001) in your browser.

---

#### Option B: Full Containerized Deploy (Docker Compose)
To run the entire app (API + database + redis) in containers:
```bash
docker compose up --build -d
```
The Express API will be exposed on port `3000`.

---

## Testing & Utilities

### E2E Backend Tests
Run the integration test suite to verify token rotation, blacklisting, and RBAC:
```bash
node test-endpoints.js
```

### Promote an Account to Admin
If you register a standard account via the signup tab and want to test admin privileges, run:
```bash
node promote-admin.js <user-email-address>
```
