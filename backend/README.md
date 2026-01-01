# Upbit Clone Backend (Node.js)

Real-time cryptocurrency ticker API for Upbit Clone.

## Tech Stack

- Node.js + Express
- TypeScript
- Prisma (PostgreSQL ORM)
- JWT Authentication
- bcrypt (Password Hashing)
- node-cron (Scheduler)

## Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### Market Data

- `GET /api/v1/candles/:symbol` - Get candle data
- `GET /api/v1/symbols` - Get available symbols
- `GET /api/v1/latest` - Get latest prices
