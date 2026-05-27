# Roommate Bumble 🐻🏠

A production-grade, highly scalable full-stack SaaS platform designed for student roommate matching and co-living listings, utilizing a hybrid machine learning recommendation engine.

---

## 🛠️ Technology Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, React Query, Socket.IO Client.
- **Backend:** Node.js, Express, TypeScript, JWT (Double token Access + Refresh), Prisma ORM, Socket.IO, Redis.
- **ML Service:** FastAPI, NumPy, Pandas, SciPy, Scikit-learn (MinMaxScaler, Euclidean + Hamming distances).
- **Database:** PostgreSQL, Redis (for horizontal Socket.IO scaling).
- **Deployment:** Docker & Docker Compose.

---

## 🏗️ Monorepo Structure

```text
roommate-bumble/
├── client/                 # Next.js 14 App Router
├── server/                 # Express.js REST & WebSockets gateway
├── ml-service/             # FastAPI recommendation microservice
├── database/               # Prisma Schema & configuration
├── docker/                 # Service Dockerfiles & compose
└── README.md               # Setup & Architecture document
```

---

## 🚀 Installation & Getting Started

### 📋 Prerequisites
- **Node.js:** v18.x or v20.x
- **Python:** v3.10+
- **Docker & Docker Compose** (highly recommended for single-command start!)
- **PostgreSQL** instance running locally or inside Docker.
- **Redis** instance running locally or inside Docker (required for Socket.IO).

---

### 🐳 Quick Start: Docker Compose (Recommended)

To spin up all services together, including PostgreSQL, the Express API backend, the Next.js portal, and the FastAPI engine:

1. Navigate to the root directory.
2. Run the compose command:
   ```bash
   npm run docker:up
   ```
3. To shut down all services:
   ```bash
   npm run docker:down
   ```

---

### 💻 Manual Local Development Setup

If you prefer to run services individually without Docker, configure each layer step-by-step:

#### 1. Database Setup
Ensure PostgreSQL is active and create a database named `roommate_bumble`.

#### 2. Express Backend Setup
1. Navigate to `server/`:
   ```bash
   cd server
   ```
2. Create your environment config `.env` (a fully configured `.env` has already been generated for you!):
   ```ini
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roommate_bumble?schema=public"
   JWT_ACCESS_SECRET="super-secret-jwt-access-key-12345!"
   JWT_REFRESH_SECRET="super-secret-jwt-refresh-key-67890!"
   ML_SERVICE_URL="http://localhost:8000"
   CLIENT_URL="http://localhost:3000"
   REDIS_URL="redis://localhost:6379"
   NODE_ENV=development
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run Prisma database migrations and generate the client bindings:
   ```bash
   npx prisma migrate dev --schema=../database/schema.prisma
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The Express server will boot at: http://localhost:5000*

#### 3. FastAPI Recommendation Service Setup
1. Navigate to `ml-service/`:
   ```bash
   cd ml-service
   ```
2. Initialize and activate a Python virtual environment:
   ```bash
   # On Windows:
   python -m venv venv
   venv\Scripts\activate

   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install ML and mathematical dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI recommendation microservice:
   ```bash
   python main.py
   ```
   *The FastAPI engine will boot at: http://localhost:8000 (Health Check: http://localhost:8000/health)*

#### 4. Next.js Frontend Setup
1. Navigate to `client/`:
   ```bash
   cd client
   ```
2. Install frontend assets:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Open your web browser and navigate to: http://localhost:3000*

---

## 🔒 API Endpoints Index

### 🔑 Authentication Gateway (`/api/auth`)
- `POST /register`: Accepts `{ email, password }` $\rightarrow$ Registers new User, returns Access & Refresh tokens (securely hashed in DB).
- `POST /login`: Accepts `{ email, password }` $\rightarrow$ Validates credentials, returns Access & Refresh tokens (securely hashed in DB).
- `POST /refresh`: Accepts `{ refreshToken }` $\rightarrow$ Validates hashed token and returns a fresh Access token.
- `POST /logout`: Accepts `{ refreshToken }` $\rightarrow$ Revokes active Refresh token from the DB.

### 👤 Profile Vector (`/api/profile`) *(Protected)*
- `GET /me`: Fetches detailed profile and preferences vector for the active user context.
- `PUT /me`: Atomic upserts profile variables (`name`, `gender`, `course`, etc.) and preference bounds.

### 🧠 Recommendation Pipeline (`/api/recommendations`) *(Protected)*
- `GET /`: Queries same-gender candidate list, standardizes budget/work values using `MinMaxScaler` with fixed bounds, dynamically encodes course and housing preferences, calculates hybrid Euclidean-Hamming scores, and returns compatibility matches sorted descending.
