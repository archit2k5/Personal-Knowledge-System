# Personal Knowledge Chat

A full-stack MERN + Qdrant + Groq + Cloudflare R2 knowledge system where users create chats, upload documents (PDF, DOCX, TXT, MD), and ask questions answered with grounded citations from those documents.

**Every chat is an isolated context**: its own message history and its own document set. Nothing is retrieved from other chats or other users.

---

##  Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React (Vite) + React Router v6 + TanStack Query | Responsive 3-pane chat interface & auth flows |
| **Backend API** | Node.js (ES Modules) + Express | REST API, SSE streaming, request validation |
| **Database** | MongoDB (Mongoose) | Users, refresh tokens, chats, messages, document metadata |
| **Vector DB** | Qdrant | Vector embeddings & multi-tenant filtered search |
| **LLM** | Groq API (`llama-3.3-70b-versatile` & `llama-3.1-8b-instant`) | Streaming completions & query rewriting |
| **Embeddings** | Local / Hosted vector embeddings (384 dimensions) | Vector embeddings for chunks and search queries |
| **Validation** | Zod | Environment and request body/query/param validation |
| **File Storage** | Cloudflare R2 (S3-compatible via `@aws-sdk/client-s3`) | Private object storage & presigned downloads |
| **Email Service** | Mailtrap (SMTP via `nodemailer`) | Account verification and password reset emails |

---

##  Project Structure

```text
Personal Knowledge System/
├── architecture.md            # System architecture specification
├── docker-compose.yml         # Local MongoDB, Qdrant, and Redis services
├── server/
│   ├── .env.example           # Backend environment variables template
│   ├── package.json           # Backend dependencies and scripts
│   └── src/
│       ├── server.js          # Boot script & graceful shutdown
│       ├── app.js             # Express app & route mounting
│       ├── config/            # Zod-validated env & Mongo connection
│       ├── controllers/       # Thin request handlers
│       ├── jobs/              # Document ingestion worker & cleanup schedules
│       ├── mail/              # Nodemailer Mailtrap client & HTML email templates
│       ├── middlewares/       # Auth, rate limiting, validation, chat ownership (404)
│       ├── models/            # Mongoose models (User, RefreshToken, Chat, Message, Document)
│       ├── rag/               # Parsers (PDF, DOCX, TXT), chunker, retriever, Qdrant, Groq LLM
│       ├── routes/            # API routes mounted under /api/v1
│       ├── services/          # Core business logic
│       ├── storage/           # Cloudflare R2 S3 client & presigned URLs
│       ├── utils/             # ApiError, ApiResponse, tokens, logger, SSE writer
│       └── validators/        # Zod validation schemas
└── client/
    ├── package.json           # Frontend dependencies and scripts
    ├── vite.config.js         # Vite configuration with /api reverse proxy
    ├── index.html             # HTML entry point
    └── src/
        ├── App.jsx            # React Router setup & protected routes
        ├── index.css          # Modern dark theme styles
        ├── api/               # API clients with automatic 401 token refresh
        ├── context/           # AuthContext (session state in memory)
        ├── features/
        │   ├── auth/          # Login, Register, VerifyEmail, ForgotPassword, ResetPassword, AccountModal
        │   ├── chat/          # ChatView, MessageList, MessageBubble, Composer, SourcesPanel
        │   ├── chats/         # Sidebar & ChatsLayout
        │   └── documents/     # UploadDropzone & DocumentList (status badges)
        └── lib/               # SSE streaming reader with AbortController
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v20 or higher
- **Docker**: (Optional, for running MongoDB & Qdrant locally)

### 2. Start Local Databases (Docker)
Run the provided Docker Compose stack to start MongoDB and Qdrant:
```bash
docker compose up -d
```
This spins up:
- **MongoDB** at `mongodb://localhost:27017`
- **Qdrant** at `http://localhost:6333`
- **Redis** at `localhost:6379`

### 3. Backend Setup
1. Navigate to the `server/` directory and install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Create your `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
3. Fill in your credentials in `server/.env`:
   - `MONGODB_URI`: `mongodb://localhost:27017/pks`
   - `QDRANT_URL`: `http://localhost:6333`
   - `GROQ_API_KEY`: Your Groq API key from [groq.com](https://console.groq.com)
   - `MAILTRAP_USER` & `MAILTRAP_PASS`: Your Mailtrap sandbox SMTP credentials
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`: Cloudflare R2 credentials
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   The API will start at `http://localhost:5000`.

### 4. Frontend Setup
1. In a new terminal, navigate to the `client/` directory and install dependencies:
   ```bash
   cd client
   npm install
   ```
2. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5174`.

---

## Security & Key Design Decisions

- **Strict Chat & Tenant Isolation**: Every Qdrant vector search strictly includes `{ userId: X, chatId: Y }` filters constructed server-side. Deleting a chat cascades deletions across MongoDB records, R2 object prefixes (`users/{userId}/chats/{chatId}/`), and Qdrant vector points.
- **Probe-Proof Ownership Checks**: Chat routes verify ownership and return `404 NOT_FOUND` (instead of `403`) to prevent chat ID probing.
- **In-Memory JWT & Rotating Cookies**: Access tokens are stored in client memory; refresh tokens live in secure, httpOnly cookies with family rotation and reuse detection.
- **Single-Use Hashed Tokens**: Email verification and password reset tokens are stored as SHA-256 hashes on the User model and expire automatically.
- **No Account Enumeration**: The forgot-password endpoint always returns `202 ACCEPTED` with a generic message regardless of whether the email exists.
- **SSE Streaming**: Responses stream token-by-token over Server-Sent Events from `POST /chats/:chatId/messages`.
- **Grounded Citations**: The prompt enforces that the assistant answers strictly from retrieved chunks, citing sources as `[n]` which open interactive snippet cards.
- **Follow-up Query Rewriting**: Follow-up questions (e.g. "what was its cost?") are rewritten into standalone search queries using Groq's fast model before vector retrieval.

---

##  API Reference Overview

Base path: `/api/v1`

### Auth (`/auth`)
- `POST /auth/register` - Create account & send Mailtrap verification link
- `POST /auth/verify-email` - Verify email token
- `POST /auth/resend-verification` - Resend verification email (60s cooldown)
- `POST /auth/forgot-password` - Request password reset link (1h validity, 60s cooldown)
- `POST /auth/reset-password` - Set new password & revoke all refresh token families
- `POST /auth/login` - Authenticate, returns `{ user, accessToken }` + sets refresh cookie
- `POST /auth/refresh` - Rotate refresh cookie & issue new access token
- `POST /auth/logout` - Clear refresh cookie & revoke session family
- `GET /auth/me` & `PATCH /auth/me` - Read & update profile information
- `POST /auth/change-password` - Change password from authenticated session

### Chats (`/chats`)
- `POST /chats` - Create new chat session
- `GET /chats` - List user's chats sorted by last message time
- `GET /chats/:chatId` - Get chat details & document count
- `PATCH /chats/:chatId` - Rename chat or update settings (`topK`, `temperature`, `model`)
- `DELETE /chats/:chatId` - Cascade delete chat, messages, R2 files, and vector points

### Messages (`/chats/:chatId/messages`)
- `GET /chats/:chatId/messages` - Fetch chat message history
- `POST /chats/:chatId/messages` - Send prompt & stream assistant answer over SSE
- `POST /chats/:chatId/messages/:messageId/regenerate` - Regenerate assistant response
- `POST /chats/:chatId/messages/stop` - Terminate generation
- `DELETE /chats/:chatId/messages` - Clear message history for this chat

### Documents (`/chats/:chatId/documents`)
- `POST /chats/:chatId/documents` - Upload up to 5 files (PDF, DOCX, TXT, MD; max 20MB)
- `GET /chats/:chatId/documents` - List documents and status (`uploaded`, `processing`, `ready`, `failed`)
- `GET /chats/:chatId/documents/:documentId` - Document details & chunk count
- `GET /chats/:chatId/documents/:documentId/file` - Short-lived presigned R2 download URL
- `POST /chats/:chatId/documents/:documentId/reprocess` - Re-trigger ingestion pipeline
- `DELETE /chats/:chatId/documents/:documentId` - Delete document, R2 file, and vector chunks

### Health (`/health`)
- `GET /health` - API uptime check
- `GET /health/deps` - Check connectivity to MongoDB & Qdrant

