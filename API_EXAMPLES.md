# API Examples

Complete examples for testing the FX Trading App API.

## Base URL

```
http://localhost:3000
```

## Authentication Flow

### 1. Register New User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }'
```

**Response:**

```json
{
  "message": "Registration successful. Please check your email for OTP.",
  "email": "john.doe@example.com"
}
```

### 2. Verify Email with OTP

Check your email for the 6-digit OTP, then:

```bash
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "otp": "123456"
  }'
```

**Response:**

```json
{
  "message": "Email verified successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "role": "USER"
  }
}
```

**Save the token! You'll need it for all authenticated requests.**

### 3. Login (if already verified)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }'
```

### 4. Resend OTP

```bash
curl -X POST http://localhost:3000/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

---

## Wallet Operations

**Note:** Replace `YOUR_JWT_TOKEN` with the token from login/verify.

### Get All Wallet Balances

```bash
curl -X GET http://localhost:3000/wallet \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "message": "Wallets retrieved successfully",
  "wallets": [
    {
      "currency": "NGN",
      "balance": "50000.00",
      "lockedBalance": "0.00",
      "updatedAt": "2024-02-04T12:30:00.000Z"
    },
    {
      "currency": "USD",
      "balance": "32.50",
      "lockedBalance": "0.00",
      "updatedAt": "2024-02-04T12:35:00.000Z"
    }
  ]
}
```

### Get Specific Currency Balance

```bash
curl -X GET http://localhost:3000/wallet/NGN \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Fund Wallet

```bash
curl -X POST http://localhost:3000/wallet/fund \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "NGN",
    "amount": 50000,
    "reference": "fund-20240204-001"
  }'
```

**Response:**

```json
{
  "message": "Wallet funded successfully",
  "transaction": {
    "id": "txn-id-123",
    "type": "FUND",
    "toCurrency": "NGN",
    "toAmount": "50000.00",
    "status": "COMPLETED",
    "reference": "fund-20240204-001",
    "createdAt": "2024-02-04T12:30:00.000Z"
  },
  "wallet": {
    "currency": "NGN",
    "balance": "50000.00",
    "updatedAt": "2024-02-04T12:30:00.000Z"
  }
}
```

---

## FX Rates

### Get All Rates for Base Currency

```bash
# Default base: NGN
curl -X GET http://localhost:3000/fx/rates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Specify base currency
curl -X GET http://localhost:3000/fx/rates?base=USD \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "message": "FX rates retrieved successfully",
  "baseCurrency": "NGN",
  "rates": {
    "USD": {
      "fromCurrency": "NGN",
      "toCurrency": "USD",
      "rate": "0.000645",
      "timestamp": "2024-02-04T12:30:00.000Z",
      "ageSeconds": 5,
      "source": "exchangerate-api"
    },
    "EUR": {
      "fromCurrency": "NGN",
      "toCurrency": "EUR",
      "rate": "0.000596",
      "timestamp": "2024-02-04T12:30:00.000Z",
      "ageSeconds": 5,
      "source": "exchangerate-api"
    },
    "GBP": {
      "fromCurrency": "NGN",
      "toCurrency": "GBP",
      "rate": "0.000511",
      "timestamp": "2024-02-04T12:30:00.000Z",
      "ageSeconds": 5,
      "source": "exchangerate-api"
    }
  },
  "timestamp": "2024-02-04T12:30:05.000Z"
}
```

### Get Specific Rate

```bash
curl -X GET http://localhost:3000/fx/rates/NGN/USD \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "message": "FX rate retrieved successfully",
  "fromCurrency": "NGN",
  "toCurrency": "USD",
  "rate": "0.000645",
  "timestamp": "2024-02-04T12:30:00.000Z",
  "ageSeconds": 5,
  "source": "exchangerate-api"
}
```

---

## Currency Trading

### Preview Conversion (No Execution)

```bash
curl -X GET "http://localhost:3000/trading/preview?from=NGN&to=USD&amount=10000" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "fromCurrency": "NGN",
  "fromAmount": "10000",
  "toCurrency": "USD",
  "toAmount": "6.45",
  "rate": "0.000645",
  "rateTimestamp": "2024-02-04T12:30:00.000Z",
  "rateAgeSeconds": 15,
  "rateSource": "exchangerate-api",
  "note": "This is a preview. Actual rate may differ at the time of conversion."
}
```

### Convert Currency

```bash
curl -X POST http://localhost:3000/trading/convert \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromCurrency": "NGN",
    "toCurrency": "USD",
    "amount": 10000,
    "reference": "convert-20240204-001"
  }'
```

**Response:**

```json
{
  "message": "Currency converted successfully",
  "transaction": {
    "id": "txn-id-456",
    "fromCurrency": "NGN",
    "fromAmount": "10000.00",
    "toCurrency": "USD",
    "toAmount": "6.45",
    "fxRate": "0.000645",
    "reference": "convert-20240204-001",
    "status": "COMPLETED",
    "createdAt": "2024-02-04T12:35:00.000Z"
  },
  "rateInfo": {
    "rate": "0.000645",
    "timestamp": "2024-02-04T12:30:00.000Z",
    "ageSeconds": 300,
    "source": "exchangerate-api"
  }
}
```

### Trade Currency (Same as Convert)

```bash
curl -X POST http://localhost:3000/trading/trade \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fromCurrency": "USD",
    "toCurrency": "NGN",
    "amount": 50,
    "reference": "trade-20240204-001"
  }'
```

---

## Transaction History

### Get All Transactions

```bash
# Get last 50 transactions
curl -X GET http://localhost:3000/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# With pagination
curl -X GET "http://localhost:3000/transactions?limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "message": "Transaction history retrieved successfully",
  "transactions": [
    {
      "id": "txn-id-456",
      "type": "CONVERT",
      "fromCurrency": "NGN",
      "fromAmount": "10000.00",
      "toCurrency": "USD",
      "toAmount": "6.45",
      "fxRate": "0.000645",
      "status": "COMPLETED",
      "reference": "convert-20240204-001",
      "createdAt": "2024-02-04T12:35:00.000Z"
    },
    {
      "id": "txn-id-123",
      "type": "FUND",
      "toCurrency": "NGN",
      "toAmount": "50000.00",
      "status": "COMPLETED",
      "reference": "fund-20240204-001",
      "createdAt": "2024-02-04T12:30:00.000Z"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

### Get Specific Transaction

```bash
curl -X GET http://localhost:3000/transactions/txn-id-456 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Responses

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Insufficient balance in NGN wallet",
  "error": "Bad Request"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 409 Conflict (Idempotency)

```json
{
  "statusCode": 409,
  "message": "Transaction is being processed. Please wait.",
  "error": "Conflict"
}
```

---

## Testing Tips

1. **Use Postman Collection**: Import from Swagger UI
2. **Set Environment Variables**: Store token as environment variable
3. **Use Unique References**: Always generate unique references
4. **Check Rate Age**: Look at `ageSeconds` in responses
5. **Test Idempotency**: Try same reference twice
6. **Test Concurrent Requests**: Use same reference simultaneously
