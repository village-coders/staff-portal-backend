# HFA Staff Portal — Backend API (IFRS)

A robust RESTful backend for the **Internal Financial Record System (IFRS)** of the Halal Food Authority.

## Tech Stack
- **Runtime**: Node.js (CommonJS)
- **Framework**: Express.js v5
- **Database**: MongoDB via Mongoose
- **Auth**: JWT (Bearer token + httpOnly cookie) + bcrypt
- **File Storage**: MongoDB GridFS (via multer memoryStorage)
- **Validation**: Express-Validator

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file (see `.env.example` below):
```env
PORT=3001
MONGO_URI=your_mongodb_connection_string
DB_NAME=HfaStaffPortal
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Seed First Super Admin
```bash
npm run seed
```
> ⚠️ Change the default password (`SuperAdmin@123`) immediately after first login.

### 4. Start Development Server
```bash
npm run dev
```

---

## API Base URL
```
http://localhost:3001/api/v1
```

---

## Endpoints

### Auth — `/api/v1/auth`
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | Login and receive JWT | ❌ |
| POST | `/logout` | Clear auth cookie | ❌ |
| GET | `/me` | Get current user profile | ✅ |

### Users — `/api/v1/users`
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | List all users (paginated) | admin |
| POST | `/` | Create a new user | admin |
| PUT | `/:id` | Update user (not password) | admin |
| DELETE | `/:id` | Delete user | admin |

### Claims — `/api/v1/claims`
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/` | Submit new claim | user |
| GET | `/` | List claims (role-filtered) | all |
| GET | `/:id` | Get claim by ID or ref no | all |
| PATCH | `/:id/transition` | Transition claim status | varies (state machine) |
| PUT | `/:id/resubmit` | Resubmit a PENDING claim | user |
| POST | `/:id/attachments` | Upload attachments (GridFS) | all |
| DELETE | `/:id` | Hard delete claim | admin |

### Assets — `/api/v1/assets`
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | List all assets | all |
| POST | `/` | Register new asset | admin, financial_officer |
| GET | `/:id` | Get asset by ID or serial | all |
| PUT | `/:id` | Update asset | admin, financial_officer |
| POST | `/:id/attachments` | Upload asset files (GridFS) | admin, financial_officer |
| DELETE | `/:id` | Delete asset | admin |

### Notifications — `/api/v1/notifications`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user's notifications |
| PATCH | `/mark-read` | Mark all as read |
| PATCH | `/:id/mark-read` | Mark one as read |

### Files — `/api/v1/files`
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:id` | Stream file from GridFS |

---

## Claim Lifecycle (State Machine)

```
NEW ──→ VERIFIED ──→ APPROVED_FOR_PAYMENT ──→ PAID
 │          │
 │          └──→ FURTHER_APPROVAL ──→ VERIFIED (Board approved)
 │                                └──→ REJECTED
 └──→ PENDING ──→ NEW (resubmitted)
 └──→ REJECTED
```

| From | To | Role |
|------|----|------|
| NEW | VERIFIED | financial_officer |
| NEW | PENDING | financial_officer |
| NEW | REJECTED | financial_officer |
| PENDING | NEW | user (resubmit) |
| VERIFIED | APPROVED_FOR_PAYMENT | ceo |
| VERIFIED | FURTHER_APPROVAL | ceo |
| VERIFIED | NEW | ceo (reversal) |
| FURTHER_APPROVAL | VERIFIED | chairman |
| FURTHER_APPROVAL | REJECTED | chairman |
| APPROVED_FOR_PAYMENT | PAID | accountant |

---

## User Roles
| Role | Description |
|------|-------------|
| `user` | Staff member — submits and tracks own claims |
| `financial_officer` | First reviewer — verifies, sends feedback, or rejects |
| `ceo` | Second reviewer — approves, escalates, or returns |
| `chairman` | Board reviewer — approves or rejects escalated claims |
| `accountant` | Payment processor — marks claims as PAID |
| `admin` | User management and system oversight (including hard delete claims/assets) |

---

## File Structure
```
├── config/
│   └── connectToDb.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   ├── claimController.js
│   ├── assetController.js
│   ├── notificationController.js
│   └── fileController.js
├── middlewares/
│   ├── authMiddlewares.js
│   ├── errorHandler.js
│   └── upload.js
├── models/
│   ├── users.js
│   ├── Claim.js
│   ├── Asset.js
│   └── Notification.js
├── routers/
│   ├── authRouter.js
│   ├── userRouter.js
│   ├── claimRouter.js
│   ├── assetRouter.js
│   ├── notificationRouter.js
│   └── fileRouter.js
├── utils/
│   ├── stateMachine.js
│   ├── generateClaimRef.js
│   ├── generateSerialNumber.js
│   ├── sendNotification.js
│   └── gridfs.js
├── index.js
├── seed.js
└── package.json
```
