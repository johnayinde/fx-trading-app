# FX Trading App

A production-ready multi-currency wallet and FX trading platform built with NestJS, TypeORM, PostgreSQL, and Redis. Users can register, verify their email, fund wallets, and trade between Naira (NGN) and major international currencies (USD, EUR, GBP) using real-time exchange rates.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Testing](#testing)
- [Environment Variables](#environment-variables)

---

## Features

### Core Features

- User Registration & Email Verification - OTP-based email verification
- Multi-Currency Wallet - Support for NGN, USD, EUR, GBP
- Real-Time FX Rates - Integration with external FX rate API
- Currency Conversion - Trade between any supported currencies
- Transaction History - Complete audit trail of all operations
- Idempotency - Prevent double-spending and duplicate transactions

### Advanced Features

- Race Condition Prevention - Pessimistic locking with SERIALIZABLE isolation
- Redis Caching - 60-second cache for FX rates
- Graceful Fallback - Uses last known rates if API fails
- Rate Transparency - Shows rate age and warns if stale
- Atomic Operations - All-or-nothing transaction guarantees
- Decimal Precision - No floating-point errors using Decimal.js
- JWT Authentication - Secure API access
- Swagger Documentation - Interactive API explorer

---

## Tech Stack

| Component          | Technology              |
| ------------------ | ----------------------- |
| **Framework**      | NestJS 10.x             |
| **Language**       | TypeScript 5.x          |
| **ORM**            | TypeORM 0.3.x           |
| **Database**       | PostgreSQL 14           |
| **Cache**          | Redis 7                 |
| **Authentication** | JWT + Passport          |
| **Validation**     | class-validator         |
| **API Docs**       | Swagger/OpenAPI         |
| **Email**          | Nodemailer              |
| **HTTP Client**    | Axios                   |
| **Precision Math** | Decimal.js              |
| **Testing**        | Jest                    |
| **Container**      | Docker + Docker Compose |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+ (or use Docker)
- Redis 7+ (or use Docker)

### Option 1: Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/johnayinde/fx-trading-app.git
cd fx-trading-app

# Copy environment file
cp .env.example .env

# Edit .env with your configuration (especially SMTP credentials)
nano .env

# Start all services
docker-compose up --build

# The application will be available at:
# - API: http://localhost:3000
# - Swagger Docs: http://localhost:3000/api/docs
```

### Option 2: Local Development Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and email credentials

# Start PostgreSQL and Redis (if not using Docker)
# OR start only DB and Redis with Docker:
docker-compose up postgres redis -d

# Run migrations (if any)
npm run migration:run

# Start development server
npm run start:dev

# Application runs on http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
```

### Initial Setup Checklist

- [ ] PostgreSQL is running
- [ ] Redis is running
- [ ] Environment variables configured
- [ ] SMTP credentials set (for OTP emails)
- [ ] Application starts without errors
- [ ] Can access Swagger docs

---

## API Documentation

### Swagger UI

Once the application is running, visit:

```
http://localhost:3000/api/docs
```

The Swagger UI provides:

- Complete API documentation
- Interactive endpoint testing
- Request/response examples
- Built-in authentication

### Quick API Overview

#### Authentication Endpoints

| Method | Endpoint           | Description                  |
| ------ | ------------------ | ---------------------------- |
| POST   | `/auth/register`   | Register new user + send OTP |
| POST   | `/auth/verify`     | Verify email with OTP        |
| POST   | `/auth/login`      | Login with credentials       |
| POST   | `/auth/resend-otp` | Resend OTP email             |

#### Wallet Endpoints (Requires Auth)

| Method | Endpoint            | Description                   |
| ------ | ------------------- | ----------------------------- |
| GET    | `/wallet`           | Get all wallet balances       |
| GET    | `/wallet/:currency` | Get specific currency balance |
| POST   | `/wallet/fund`      | Fund wallet in any currency   |

#### FX Rate Endpoints (Requires Auth)

| Method | Endpoint              | Description                     |
| ------ | --------------------- | ------------------------------- |
| GET    | `/fx/rates`           | Get all rates for base currency |
| GET    | `/fx/rates/:from/:to` | Get specific rate               |

#### Trading Endpoints (Requires Auth)

| Method | Endpoint           | Description        |
| ------ | ------------------ | ------------------ |
| POST   | `/trading/convert` | Convert currency   |
| POST   | `/trading/trade`   | Trade currency     |
| GET    | `/trading/preview` | Preview conversion |

#### Transaction Endpoints (Requires Auth)

| Method | Endpoint            | Description              |
| ------ | ------------------- | ------------------------ |
| GET    | `/transactions`     | Get transaction history  |
| GET    | `/transactions/:id` | Get specific transaction |

### Example API Flow

```bash
# 1. Register user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# 2. Verify email (check your email for OTP)
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "otp": "123456"
  }'
# Response includes JWT token

# 3. Fund NGN wallet (use JWT token)
curl -X POST http://localhost:3000/wallet/fund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "NGN",
    "amount": 50000,
    "reference": "fund-ref-001"
  }'

# 4. Get current FX rates
curl -X GET http://localhost:3000/fx/rates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 5. Convert NGN to USD
curl -X POST http://localhost:3000/trading/convert \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromCurrency": "NGN",
    "toCurrency": "USD",
    "amount": 10000,
    "reference": "convert-ref-001"
  }'

# 6. Get transaction history
curl -X GET http://localhost:3000/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Architecture

### System Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/REST + JWT
┌──────▼───────────────────────────────────────┐
│          NestJS Application                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────┐ │
│  │  Auth  │ │ Wallet │ │Trading │ │  FX  │ │
│  └────────┘ └────────┘ └────────┘ └──────┘ │
│                TypeORM                        │
└──────┬───────────────────┬───────────────────┘
       │                   │
┌──────▼──────┐    ┌──────▼──────┐
│ PostgreSQL  │    │    Redis    │
│  (Wallets,  │    │ (FX Rates   │
│   Txns)     │    │  Cache)     │
└─────────────┘    └─────────────┘
                          │
                   ┌──────▼──────┐
                   │  External   │
                   │  FX API     │
                   └─────────────┘
```

### Database Schema

#### Users Table

```sql
- id (UUID, PK)
- email (unique)
- password (hashed)
- role (USER/ADMIN)
- isVerified (boolean)
- otp (nullable)
- otpExpiry (timestamp)
- otpAttempts (integer)
- createdAt, updatedAt
```

#### Wallets Table

```sql
- id (UUID, PK)
- userId (FK → users)
- currency (NGN/USD/EUR/GBP)
- balance (DECIMAL 15,2)
- lockedBalance (DECIMAL 15,2)
- version (for optimistic locking)
- createdAt, updatedAt

UNIQUE INDEX on (userId, currency)
```

#### Transactions Table

```sql
- id (UUID, PK)
- userId (FK → users)
- type (FUND/CONVERT/TRADE)
- fromCurrency, fromAmount
- toCurrency, toAmount
- fxRate (DECIMAL 10,6)
- status (PENDING/COMPLETED/FAILED)
- reference (unique, for idempotency)
- metadata (JSONB)
- errorMessage (text)
- createdAt, updatedAt

INDEXES on userId, reference, status, createdAt
```

#### FX Rates Table (Audit Trail)

```sql
- id (UUID, PK)
- fromCurrency
- toCurrency
- rate (DECIMAL 10,6)
- source (string)
- fetchedAt (timestamp)

INDEXES on (fromCurrency, toCurrency), fetchedAt
```

### Key Design Decisions

#### 1. Multi-Currency Wallet Strategy

**Decision:** Separate wallet record per currency

**Rationale:**

- Easier to query and lock individual currencies
- Scalable to add new currencies
- Clear balance per currency
- Atomic operations on single currency

#### 2. Race Condition Prevention

**Approach:** Pessimistic locking + SERIALIZABLE isolation

```typescript
// Lock wallets before modification
const sourceWallet = await manager.findOne(Wallet, {
  where: { userId, currency: "NGN" },
  lock: { mode: "pessimistic_write" },
});
```

**Benefits:**

- Prevents double-spending
- Database-level guarantee
- No complex retry logic needed

#### 3. Idempotency Implementation

**Pattern:** Transaction log with unique reference

```typescript
// Check if reference exists
const existing = await findTransaction({ reference });
if (existing && existing.status === "COMPLETED") {
  return cachedResult;
}

// Create PENDING transaction BEFORE processing
await createTransaction({ reference, status: "PENDING" });
```

**Benefits:**

- Prevents duplicate transactions
- Handles client double-taps
- Safe retries
- Complete audit trail

#### 4. FX Rate Caching Strategy

**3-Layer Approach:**

```
1. Redis Cache (60s TTL) ← Fast
2. External API         ← Real-time
3. Database (fallback)  ← Last known
```

**Benefits:**

- Reduces API calls
- Handles API failures gracefully
- Shows rate age to user
- Complete transparency

#### 5. Decimal Precision

**Tool:** Decimal.js library

**Why:**

```javascript
// JavaScript problem
0.1 + 0.2; // 0.30000000000000004 (Wrong)

// Decimal.js solution
new Decimal(0.1).plus(0.2).toString(); // "0.3" (Correct)
```

**Usage:**

- All currency amounts
- FX rate calculations
- Balance updates

---

## Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# E2E tests
npm run test:e2e
```

### Test Coverage

The project includes comprehensive tests for:

- Authentication (registration, OTP, login)
- Wallet operations (funding, balance checks)
- Trading (conversions, idempotency)
- FX rate fetching and caching
- Transaction history
- Error scenarios
- Race conditions

**Target Coverage:** 80%+ statement coverage

### Key Test Scenarios

#### Auth Tests

- User registration
- OTP generation and verification
- OTP expiry handling
- Maximum attempt limiting
- JWT token generation
- Login validation

#### Wallet Tests

- Multi-currency wallet creation
- Funding operations
- Balance checks
- Insufficient balance handling
- Concurrent operations

#### Trading Tests

- Currency conversion
- Rate fetching
- Idempotency enforcement
- Transaction rollback on error
- Stale rate warnings
- Same currency rejection

---

## Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=development
PORT=3000

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password
DB_DATABASE=fx_trading_db

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRATION=24h

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=60

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@trading.com

# FX Rate API
FX_API_URL=https://api.exchangerate-api.com/v4/latest
FX_API_KEY=
FX_CACHE_TTL=60

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3
```

### Gmail SMTP Setup

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (custom name)"
   - Use generated password as `SMTP_PASSWORD`

### Alternative Email Providers

**Mailtrap (Development):**

```bash
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-user
SMTP_PASSWORD=your-mailtrap-password
```

**SendGrid:**

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

---

## Key Assumptions

1. **Supported Currencies:** NGN, USD, EUR, GBP (easily extendable)
2. **Initial Funding:** Users fund in NGN initially (but can fund in any currency)
3. **FX Rate Source:** ExchangeRate-API (free tier)
4. **Rate Refresh:** Every 60 seconds via Redis cache
5. **Transaction Fees:** None (0%) - can be added as configuration
6. **Minimum Amounts:** 0.01 for all currencies
7. **Decimal Precision:** 2 decimal places for display (6 for rates)
8. **OTP Validity:** 10 minutes
9. **OTP Delivery:** Email (SMS can be added)
10. **Conversion Type:** Spot conversion (instant market rate)
11. **No Pending Orders:** All conversions are immediate
12. **No Trading Fees:** Direct conversion at fetched rate

---
