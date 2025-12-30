# File Upload API with Asynchronous Email Validation

An Express.js API that processes CSV file uploads containing user data and performs asynchronous email validation. Built with TypeScript, featuring real-time progress tracking, rate limiting, and comprehensive error handling.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Testing](#testing)
- [Logging](#logging)

---

## Overview

This API accepts CSV files containing `name` and `email` columns, validates each email address asynchronously, and provides real-time progress tracking. It's designed to handle large files efficiently using streaming, control concurrency to avoid overwhelming external services, and provide detailed feedback on validation results.

---

## Features

| Feature | Description |
|---------|-------------|
| CSV Upload | Single and multiple file upload support |
| Email Validation | Format checking + mock external API validation |
| Progress Tracking | Real-time status updates per email |
| Rate Limiting | Configurable request limits per IP |
| Input Sanitisation | XSS and SQL injection prevention |
| Streaming Parser | Memory-efficient large file handling |
| Database Abstraction | Redis (production) / In-Memory (testing) |
| Swagger Documentation | Interactive API documentation |
| Comprehensive Logging | Winston with multiple transports |
| Graceful Shutdown | Clean connection handling on SIGTERM/SIGINT |

---

## Architecture

<img width="755" height="1085" alt="image" src="https://github.com/user-attachments/assets/fd50db19-060f-4750-9409-ff9ac540c596" />


---

## Getting Started

### Prerequisites

- Node.js 18+
- Redis or use in-memory database for development
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/paymonsattar/solirius-email-validator

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Create required directories
mkdir -p uploads logs
```

### Environment Configuration

Create a `.env` file:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
REDIS_URL=redis://localhost:6379

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10

# Processing
CONCURRENT_VALIDATIONS=5
EMAIL_VALIDATION_TIMEOUT=100

# Logging
LOG_LEVEL=info
```

### Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

### Accessing the Application

- **Web UI**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

---

## API Endpoints

### POST /upload

Upload a single CSV file for processing.

**Request:**
```bash
curl -X POST http://localhost:3000/upload \
  -F "file=@users.csv"
```

**Response (202 Accepted):**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "File 'users.csv' uploaded successfully. Processing started."
}
```

### POST /upload/multiple

Upload multiple CSV files simultaneously.

**Request:**
```bash
curl -X POST http://localhost:3000/upload/multiple \
  -F "files=@users1.csv" \
  -F "files=@users2.csv"
```

**Response (202 Accepted):**
```json
{
  "uploads": [
    {
      "uploadId": "550e8400-e29b-41d4-a716-446655440000",
      "message": "File 'users1.csv' uploaded. Processing started."
    },
    {
      "uploadId": "550e8400-e29b-41d4-a716-446655440001",
      "message": "File 'users2.csv' uploaded. Processing started."
    }
  ],
  "message": "2 file(s) uploaded successfully. Processing started."
}
```

### GET /status/:uploadId

Get processing status (summary view).

**Response (Processing):**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": "45%"
}
```

**Response (Completed):**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "totalRecords": 10,
  "processedRecords": 10,
  "failedRecords": 2,
  "details": [
    {
      "name": "Jane Smith",
      "email": "invalid-email",
      "error": "Invalid email format"
    },
    {
      "name": "Bob Wilson",
      "email": "bob@fake.com",
      "error": "Mailbox not found"
    }
  ]
}
```

### GET /status/:uploadId/detailed

Get detailed status including individual email records.

**Response:**
```json
{
  "uploadId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "totalRecords": 10,
  "processedRecords": 6,
  "failedRecords": 1,
  "progress": 60,
  "emailRecords": [
    { "index": 0, "name": "John Doe", "email": "john@example.com", "status": "valid" },
    { "index": 1, "name": "Jane Smith", "email": "invalid-email", "status": "invalid", "error": "Invalid email format" },
    { "index": 2, "name": "Alice Brown", "email": "alice@test.com", "status": "valid" },
    { "index": 3, "name": "Bob Wilson", "email": "bob@example.com", "status": "pending" }
  ],
  "details": [],
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production/test) | development |
| `PORT` | Server port | 3000 |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 |
| `MAX_FILE_SIZE` | Maximum upload size in bytes | 10485760 (10MB) |
| `UPLOAD_DIR` | Temporary upload directory | ./uploads |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in ms | 60000 (1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 10 |
| `CONCURRENT_VALIDATIONS` | Max concurrent email validations | 5 |
| `EMAIL_VALIDATION_TIMEOUT` | Base validation delay in ms | 100 |
| `LOG_LEVEL` | Logging level | info |
---

## Testing

### Running Tests

```bash
# All tests with coverage
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch
```

### Test Coverage

| Directory | File | Statements | Branches | Functions | Lines |
|-----------|------|:----------:|:--------:|:---------:|:-----:|
| **src** | app.ts | 87.87% | 50% | 60% | 87.87% |
| **src/config** | env.ts | 88.88% | 100% | 66.66% | 88.88% |
| | logger.ts | 64.28% | 14.28% | 50% | 64.28% |
| **src/controllers** | statusController.ts | 77.77% | 28.57% | 100% | 77.77% |
| | uploadController.ts | 87.09% | 60% | 100% | 86.66% |
| **src/database** | InMemoryDatabase.ts | 100% | 100% | 100% | 100% |
| | RedisDatabase.ts | 5.76% | 0% | 0% | 5.76% |
| | factory.ts | 71.87% | 20% | 80% | 71.87% |
| **src/errors** | errors.ts | 100% | 50% | 100% | 100% |
| **src/middleware** | errorHandlerMiddleware.ts | 51.21% | 46.66% | 66.66% | 51.21% |
| | rateLimiterMiddleware.ts | 75% | 100% | 66.66% | 75% |
| | uploadMiddleware.ts | 86.66% | 40% | 100% | 86.66% |
| | validationMiddleware.ts | 84.21% | 88.88% | 100% | 84.21% |
| **src/routes** | *(all files)* | 100% | 100% | 100% | 100% |
| **src/schemas** | schemas.ts | 100% | 100% | 100% | 100% |
| | validators.ts | 61.53% | 100% | 20% | 61.53% |
| **src/services** | emailValidationService.ts | 98.46% | 87.5% | 92.85% | 98.36% |
| | fileProcessingService.ts | 60% | 0% | 54.54% | 60% |
| | uploadStatusService.ts | 70% | 17.24% | 72.72% | 69.62% |
| **src/swagger** | *(all files)* | 100% | 100% | 100% | 100% |
| **src/utils** | concurrency.ts | 90% | 100% | 50% | 90% |
| | csvParser.ts | 91.66% | 81.81% | 91.66% | 91.48% |
| | fileCleanup.ts | 36.36% | 0% | 0% | 36.36% |
| | timeout.ts | 100% | 0% | 100% | 100% |
| | uuid.ts | 100% | 100% | 100% | 100% |
| **Overall** | | **76.76%** | **41.81%** | **67.05%** | **75.55%** |

---

## Logging

### Winston Configuration

```typescript
// Development: Colorised console output
// Production: JSON format for log aggregation
// Test: Errors only (quiet tests)

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

### Log Levels

| Level | Usage |
|-------|-------|
| error | Errors that need attention |
| warn | Warning conditions |
| info | Normal operations (upload received, processing complete) |
| debug | Detailed debugging (each email validated) |

### Example Logs

```
2024-01-15T10:30:00.000Z [INFO]: Upload received { uploadId: "abc", filename: "users.csv", size: 1024 }
2024-01-15T10:30:00.100Z [DEBUG]: CSV headers validated { headers: ["name", "email"] }
2024-01-15T10:30:01.000Z [DEBUG]: Email validated { email: "john@test.com", valid: true }
2024-01-15T10:30:05.000Z [INFO]: Processing completed { uploadId: "abc", total: 10, failed: 1 }
```

---
