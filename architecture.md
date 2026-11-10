# Personal Knowledge Chat: Architecture

A MERN app where users sign in, create chats, attach documents (PDF/DOCX/TXT/MD) to a chat, and ask questions answered from those documents. **Every chat is an isolated context**: its own message history and its own document set. Nothing is retrieved from other chats.

## 1. Stack

| Layer | Choice | Role |
|---|---|---|
| Frontend | React (Vite) + React Router + TanStack Query | Chat UI, auth screens |
| API | Node.js + Express | REST API, SSE streaming |
| Database | MongoDB (Mongoose) | Users, chats, messages, document metadata |
| Vector DB | Qdrant | Chunk embeddings and retrieval |
| LLM | Groq API (chat completions) | Answer generation, optional query rewriting |
| Embeddings | See decision D1 | Vectors for chunks and queries |
| Validation | Zod | Request validation, env validation, shared schemas |
| Auth | JWT access token + rotating refresh token (httpOnly cookie) | Sessions |
| Email | Mailtrap (SMTP via `nodemailer`, or the official `mailtrap` SDK) | Email verification and password reset emails |
| Background jobs | BullMQ + Redis (or in-process queue for MVP) | Document ingestion |
| File storage | Cloudflare R2 (S3-compatible, via `@aws-sdk/client-s3`) | Original uploads, private bucket |

## 2. High-level diagram

```
React SPA
   |  REST + SSE (cookies / Bearer token)
   v
Express API ---- Mongo (users, chats, messages, documents)
   |   |
   |   +--- Ingestion queue ---> Worker: parse -> chunk -> embed -> upsert
   |                                                         |
   +--- RAG service: embed query -> Qdrant search (filter) --+
   |                                   |
   +--- Groq chat completion <---------+ (top-k chunks + this chat's history)
```

## 3. Key design decisions

**D1. Embeddings.** Groq serves chat/LLM models (and speech), and as far as I know it does not provide an embeddings endpoint. Verify against current Groq docs. Options:
- Local model in the worker (`fastembed` or `@xenova/transformers`, e.g. `bge-small-en-v1.5`, 384 dims). Free and private, but uses CPU/RAM.
- A hosted embeddings API (OpenAI, Voyage, Cohere, Jina).

Whichever you pick, the vector size is fixed in the Qdrant collection, so changing models later means re-embedding everything. Store `embeddingModel` on each document to track this.

**D2. Chat isolation.** One Qdrant collection (`kb_chunks`) with payload fields `userId`, `chatId`, `documentId`. Every search **must** include a filter `userId == X AND chatId == Y`, built server-side from the authenticated user and the chat in the URL, never from client input. Create payload indexes on `chatId`, `userId` and `documentId`. This scales better than a collection per chat. Deleting a chat deletes its points by filter.

**D3. History is per chat.** The prompt includes only the last N messages of the current chat (sliding window, e.g. last 10), plus retrieved chunks from that chat's documents. No cross-chat memory, no user-level memory.

**D4. Documents belong to one chat.** If a user wants the same file in two chats, it is uploaded and indexed twice. This keeps isolation simple and deletion clean. (Later option: a shared library with a chat-to-document link table, still filtered by `chatId` list at query time.)

**D5. Streaming.** Answers stream over SSE from `POST /messages` so the UI shows tokens as they arrive. The full message is saved to Mongo when the stream ends.

**D6. Grounding.** The system prompt tells the model to answer only from the provided context, cite sources as `[n]`, and say "I couldn't find this in your documents" when the context doesn't contain the answer. If a chat has no ready documents, the API either answers without retrieval or returns a hint to upload files (configurable).

**D7. File storage on Cloudflare R2.**
- One **private** bucket (e.g. `kb-uploads`) with no public access and no `r2.dev` public URL or custom public domain.
- Object key format: `users/{userId}/chats/{chatId}/{documentId}/{randomId}.{ext}`. Keys are generated server-side, and the original filename lives only in Mongo (`originalName`). Prefixing by chat makes bulk delete on chat removal a simple list-and-delete by prefix.
- Access uses the S3 API with an R2 API token scoped to this bucket (Object Read & Write only). Client config: region `auto`, endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
- **Upload path (MVP):** browser sends multipart to the API, the API validates it and streams it to R2 (`@aws-sdk/lib-storage` `Upload`). Multer uses memory or temp-file storage with the size limit enforced. **Later option:** direct browser-to-R2 uploads via presigned PUT URLs, which keep large files off your API. That needs an extra "confirm upload" endpoint that creates the Document record and enqueues ingestion.
- **Download path:** the API checks ownership, then returns a short-lived presigned GET URL (60 to 300 s). Files are never proxied publicly.
- **Worker:** reads the object from R2 (stream to a temp file for parsing), then deletes the temp file when done.
- **Lifecycle:** add an R2 lifecycle rule to abort incomplete multipart uploads after 1 day. Optionally enable a CORS policy on the bucket only if you adopt presigned browser uploads.
- R2 has no egress fees, but Class A/B operation costs still apply, so avoid listing the bucket on hot paths.

**D8. Email verification with Mailtrap.**
- **Flow:** register creates the user with `emailVerified: false`, generates a verification token, and queues an email. The user clicks the link, the frontend page calls `POST /auth/verify-email`, and only then can the user log in.
- **Token:** 32 random bytes (base64url). Only its **SHA-256 hash** is stored, **embedded in the User document** (`emailVerificationTokenHash`, `emailVerificationExpiresAt`). It expires after 24 h and is single-use: both fields are cleared once verified. Requesting a new one overwrites the old one, so only one verification token is valid at a time. The API finds the user by hashing the submitted token and querying the sparse index on `emailVerificationTokenHash`.
- **Link:** `{CLIENT_ORIGIN}/verify-email?token=...` points to a frontend page, which then POSTs the token to the API. Verification is a POST, not a GET link handled by the API, so email security scanners that prefetch links can't consume the token.
- **Unverified users** cannot log in (`403 EMAIL_NOT_VERIFIED`) and cannot hold sessions. Login for an unverified account does not issue tokens.
- **Sending:** the register request only enqueues a mail job, and a worker sends it with retries, so a slow or failing mail provider never blocks sign-up.
- **Mailtrap environments:** use the Mailtrap **Email Testing** sandbox inbox in development, where nothing reaches real users and you inspect messages in the Mailtrap UI. For production, use **Email Sending**, which requires a verified sending domain (SPF/DKIM). Check Mailtrap's current docs for the SMTP host, port and credentials of each. Switching between them is only an env change.
- **Cleanup:** a daily job deletes accounts still unverified after 7 days, which also removes their token fields.

**D9. Forgot / reset password.**
- **Flow:** the user enters their email on the forgot-password page, which calls `POST /auth/forgot-password`. If an account exists, a reset link is emailed. The link opens `{CLIENT_ORIGIN}/reset-password?token=...`, where the user enters a new password and the page calls `POST /auth/reset-password`.
- **Token:** same pattern as verification, stored on the User document as `passwordResetTokenHash`, `passwordResetExpiresAt` and `passwordResetRequestedAt`. It is 32 random bytes, stored hashed, valid for **1 hour**, and single-use. A new request overwrites the old token.
- **No account enumeration:** `forgot-password` always returns the same `202` response and takes similar time whether or not the email exists, with the email sent through the queue.
- **Unverified accounts:** if the email belongs to an unverified user, send a new verification link instead of a reset link.
- **On success:** set the new password hash, clear the reset fields, **revoke all of the user's refresh tokens** (every device is logged out), and send a "your password was changed" notice email. The user is not logged in automatically, they sign in with the new password.
- **Abuse limits:** cooldown of 60 s per account using `passwordResetRequestedAt`, plus per-IP and per-email rate limits (e.g. 5 per hour).
- **Refresh tokens stay in their own `RefreshToken` collection** (multiple devices, rotation, reuse detection, TTL cleanup).

## 4. Data models (MongoDB)

**User**
```
_id, email (unique, lowercase), passwordHash (argon2/bcrypt), name,
emailVerified (default false), emailVerifiedAt,
emailVerificationTokenHash, emailVerificationExpiresAt, emailVerificationSentAt,
passwordResetTokenHash, passwordResetExpiresAt, passwordResetRequestedAt,
passwordChangedAt,
createdAt, updatedAt
```

**RefreshToken** (or embedded in a session collection)
```
_id, userId, tokenHash, family, expiresAt, revokedAt, userAgent, ip, createdAt
```

**Chat**
```
_id, userId (index), title, createdAt, updatedAt, lastMessageAt,
settings: { topK, model, temperature }   // optional per-chat overrides
```
Index: `{ userId: 1, lastMessageAt: -1 }`

**Message**
```
_id, chatId (index), userId, role: 'user' | 'assistant' | 'system',
content, sources: [{ documentId, filename, page, chunkId, score, snippet }],
model, usage: { promptTokens, completionTokens }, status: 'complete' | 'error' | 'stopped',
createdAt
```
Index: `{ chatId: 1, createdAt: 1 }`

**Document**
```
_id, chatId (index), userId, originalName, mimeType, sizeBytes,
storageKey (R2 object key), bucket, etag,
status: 'uploaded' | 'processing' | 'ready' | 'failed', error,
pageCount, chunkCount, embeddingModel, contentHash,
createdAt, updatedAt
```
Index: `{ chatId: 1, createdAt: -1 }`, and `{ chatId: 1, contentHash: 1 }` unique to block duplicate uploads within a chat.

## 5. Qdrant layout

Collection `kb_chunks`:
- Vector: size = embedding dimension, distance = Cosine.
- Point ID: UUID (or deterministic from `documentId + chunkIndex`).
- Payload:
```
{ userId, chatId, documentId, filename, page, chunkIndex, text, createdAt }
```
- Payload indexes (keyword): `userId`, `chatId`, `documentId`.
- Optional: sparse vectors or a text index for hybrid search later.

## 6. Ingestion pipeline

1. Client uploads the file to `POST /chats/:chatId/documents`.
2. API validates (type, size, ownership of chat), uploads the file to **R2**, creates a Document with `status: uploaded` and its `storageKey`, enqueues a job, and returns `202`.
3. Worker sets `processing`, downloads the object from R2 to a temp file, then:
   - **Parse**: PDF (`pdfjs-dist` or `pdf-parse`, page-aware), DOCX (`mammoth`), TXT/MD (read directly). Scanned PDFs with no extractable text fail with a clear error (OCR is a later add-on).
   - **Clean + chunk**: about 500 to 800 tokens with 10 to 15 percent overlap, split on headings and paragraphs, and keep page numbers.
   - **Embed** in batches.
   - **Upsert** into Qdrant with the payload above.
4. Worker sets `ready` with `chunkCount`, or `failed` with an error message. The client polls `GET /chats/:chatId/documents` or `/documents/:id` for status.
5. Retries with backoff on transient failures. Re-processing first deletes existing points for that `documentId`, so it is idempotent.

## 7. Query (RAG) flow for one message

1. `POST /chats/:chatId/messages` (auth + chat ownership check + zod validation).
2. Save the user message.
3. Load the last N messages of **this chat**.
4. Optional: rewrite a follow-up like "what about its cost?" into a standalone query with a small, fast Groq model using the recent history.
5. Embed the query.
6. Qdrant search with filter `userId + chatId` (and optional `documentIds` if the user narrowed scope), `limit = topK` (default 6), score threshold applied.
7. Build the prompt: system instructions, numbered context chunks, recent history, user question. Cap total tokens.
8. Call Groq with `stream: true` and pipe tokens to the client over SSE.
9. On completion, save the assistant message with `sources` and token usage, and emit a final `done` event.

## 8. API

Base path: `/api/v1`. All JSON unless noted. Errors share one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ { "path": "email", "message": "Invalid email" } ] } }
```

Codes: `VALIDATION_ERROR` (400), `INVALID_OR_EXPIRED_TOKEN` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `EMAIL_NOT_VERIFIED` (403), `NOT_FOUND` (404), `CONFLICT` (409), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415), `RATE_LIMITED` (429), `UPSTREAM_ERROR` (502), `INTERNAL` (500).

### 8.1 Auth

| Method | Path | Auth | Body (zod) | Response |
|---|---|---|---|---|
| POST | `/auth/register` | none | `{ email, password (min 8, max 72), name }` | `201 { message: "Verification email sent" }`. No tokens are issued. Creates an unverified user and queues the email. `409` if the email is already registered |
| POST | `/auth/verify-email` | none | `{ token }` | `200 { user }` and marks the email verified. `400 INVALID_OR_EXPIRED_TOKEN` otherwise. Idempotent if already verified |
| POST | `/auth/resend-verification` | none | `{ email }` | `202` always, with the same generic response whether or not the account exists. Sends a new link only if the user exists and is unverified. Cooldown 60 s |
| POST | `/auth/forgot-password` | none | `{ email }` | `202` always, with the same generic message whether or not the account exists. Emails a reset link (1 h) to verified users, or a verification link to unverified ones. Cooldown 60 s |
| POST | `/auth/reset-password` | none | `{ token, newPassword (min 8, max 72) }` | `200 { message }`. `400 INVALID_OR_EXPIRED_TOKEN` otherwise. Sets the new password, clears the token, revokes all refresh tokens, sends a "password changed" email |
| POST | `/auth/login` | none | `{ email, password }` | `200 { user, accessToken }` + refresh cookie. `403 EMAIL_NOT_VERIFIED` if the email isn't verified (after the password check passes) |
| POST | `/auth/refresh` | refresh cookie | none | `200 { accessToken }` and rotated refresh cookie |
| POST | `/auth/logout` | refresh cookie | none | `204`, revokes the token family and clears the cookie |
| GET | `/auth/me` | access token | none | `200 { user }` |
| PATCH | `/auth/me` | access token | `{ name? }` | `200 { user }` |
| POST | `/auth/change-password` | access token | `{ currentPassword, newPassword }` | `204`, revokes all refresh tokens |

### 8.2 Chats

| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/chats` | `{ title? }` | `201 { chat }` (title defaults to "New chat", auto-titled after first message) |
| GET | `/chats` | `?cursor&limit(<=50)&q` | `200 { items: [chat], nextCursor }` sorted by `lastMessageAt` desc |
| GET | `/chats/:chatId` | none | `200 { chat, documentCount }` |
| PATCH | `/chats/:chatId` | `{ title?, settings? }` | `200 { chat }` |
| DELETE | `/chats/:chatId` | none | `204`, cascades to messages, documents, stored files and Qdrant points |

### 8.3 Messages

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/chats/:chatId/messages` | `?cursor&limit(<=100)` | `200 { items: [message], nextCursor }` oldest to newest |
| POST | `/chats/:chatId/messages` | `{ content (1..4000), documentIds? }` | `text/event-stream` (see below) |
| POST | `/chats/:chatId/messages/:messageId/regenerate` | none | SSE, same format. Only for the last assistant message |
| POST | `/chats/:chatId/messages/stop` | none | `204`, optional. The client can also just abort the fetch |
| DELETE | `/chats/:chatId/messages` | none | `204`, clears history but keeps documents |

**SSE events** for `POST .../messages`:
```
event: meta     data: { userMessageId, assistantMessageId }
event: sources  data: { sources: [{ index, documentId, filename, page, snippet, score }] }
event: token    data: { text }
event: error    data: { code, message }
event: done     data: { messageId, usage }
```
Because `EventSource` can't POST, the client uses `fetch` with a streaming reader.

### 8.4 Documents

| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/chats/:chatId/documents` | `multipart/form-data`, field `files` (up to 5, 20 MB each; pdf, docx, txt, md) | `202 { items: [document] }` with `status: processing` |
| GET | `/chats/:chatId/documents` | none | `200 { items: [document] }` |
| GET | `/chats/:chatId/documents/:documentId` | none | `200 { document }` (poll for status) |
| GET | `/chats/:chatId/documents/:documentId/file` | none | `200 { url, expiresIn }`, a short-lived R2 presigned GET URL (sets `Content-Disposition` to the original filename) |
| POST | `/chats/:chatId/documents/:documentId/reprocess` | none | `202 { document }` |
| DELETE | `/chats/:chatId/documents/:documentId` | none | `204`, removes the file, Mongo record and Qdrant points |

### 8.5 Search (optional but useful for debugging)

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/chats/:chatId/search` | `{ query, topK? }` | `200 { results: [{ documentId, filename, page, text, score }] }` |

### 8.6 System

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/health` | none | `200 { status: "ok" }` |
| GET | `/health/deps` | admin/internal | Mongo, Qdrant, Redis, Groq reachability |

## 9. Validation with Zod

- One schema file per resource in `validators/` (`auth.schema.ts`, `chat.schema.ts`, `message.schema.ts`, `document.schema.ts`).
- A single `validate({ body, query, params })` middleware (`middlewares/validate.middleware.ts`) parses and **replaces** `req.body/query/params` with the typed output. Unknown keys are stripped (`.strict()` on sensitive routes).
- Validate ObjectIds with a shared `objectId` refinement.
- Validate **environment variables** at startup (`env.ts`) and refuse to boot if invalid.
- Validate **upload** metadata (mime type, extension, size) before storing, and verify the real file type by its magic bytes, not just the header.
- Validate the **LLM/Qdrant responses** you depend on with small zod schemas, so upstream changes fail loudly.
- Export schemas (or `z.infer` types) in a shared package so the frontend forms reuse them.

## 10. Auth and security

- Passwords hashed with argon2id (or bcrypt cost 12).
- Access token (JWT, about 15 min) sent as `Authorization: Bearer`, kept in memory on the client. Refresh token (about 7 to 30 days) in an `httpOnly; Secure; SameSite=Lax` cookie, **rotated on every use** with reuse detection (reuse revokes the whole family).
- **Ownership check on every route**: load the chat by `{ _id: chatId, userId: req.user.id }`. Return `404`, not `403`, when it doesn't match, so IDs can't be probed.
- Qdrant filters always use server-derived `userId` and `chatId`. Never accept filters from the client.
- Verification and reset tokens are stored hashed (SHA-256) on the User, looked up through sparse indexes, expire (24 h and 1 h), and are single-use. `resend-verification` and `forgot-password` are limited per email and per IP (e.g. 5 per hour) and never reveal whether an account exists. Email content never includes the password. Tokens must not appear in logs, and the reset/verify pages should send `Referrer-Policy: no-referrer` so the token in the URL isn't leaked to third parties.
- Rate limits: strict on `/auth/*`, per-user on `/messages` and uploads, and a daily token budget per user to protect the Groq quota.
- `helmet`, CORS locked to the frontend origin with credentials, request body size limits, `mongo-sanitize` for operator injection.
- **Prompt injection**: documents are untrusted. Put retrieved text in a clearly delimited block, tell the model to treat it as data and not as instructions, and never give the model tools with side effects.
- Keep the R2 bucket private, store files under generated keys (never the user's filename), and serve downloads only through short-lived presigned URLs after an ownership check. Use an R2 API token limited to this bucket, and keep it out of the frontend.
- Don't log message content or document text. Log IDs, timings and token counts.

## 11. Backend structure

The backend is organised by **layer** (one folder per concern) instead of by feature module, so every controller lives in `controllers/`, every route file in `routes/`, and so on.

```
server/
  src/
    app.ts                      express setup, global middleware, route mounting
    server.ts                   boot, graceful shutdown
    config/
      env.ts                    zod-validated env
      db.ts                     Mongo connection
    routes/
      index.ts                  mounts everything under /api/v1
      auth.routes.ts
      chat.routes.ts
      message.routes.ts
      document.routes.ts
      search.routes.ts
      health.routes.ts
    controllers/                thin: read req, call a service, send ApiResponse
      auth.controller.ts
      chat.controller.ts
      message.controller.ts
      document.controller.ts
      search.controller.ts
      health.controller.ts
    middlewares/
      auth.middleware.ts        verifies access token, sets req.user
      validate.middleware.ts    zod validate({ body, query, params })
      rateLimit.middleware.ts
      upload.middleware.ts      multer + magic-byte check
      chatOwnership.middleware.ts   loads chat by { _id, userId }, 404 otherwise
      error.middleware.ts       converts ApiError / unknown errors to the standard error JSON
      notFound.middleware.ts
    utils/
      asyncHandler.ts           wraps async controllers, forwards rejections to next()
      ApiError.ts               extends Error: statusCode, code, message, details
      ApiResponse.ts            success wrapper: statusCode, data, message
      logger.ts
      tokens.ts                 random token, SHA-256 hash, JWT sign/verify
      sse.ts                    SSE writer helpers
    services/                   business logic, no req/res
      auth.service.ts
      chat.service.ts
      message.service.ts
      document.service.ts
    models/                     Mongoose models
      user.model.ts
      refreshToken.model.ts
      chat.model.ts
      message.model.ts
      document.model.ts
    validators/                 zod schemas, shared with the frontend
      auth.schema.ts
      chat.schema.ts
      message.schema.ts
      document.schema.ts
    rag/
      parsers/                  pdf.ts, docx.ts, text.ts
      chunker.ts
      embeddings.ts             provider wrapper (see D1)
      qdrant.ts                 client, ensureCollection, upsert, search, deleteBy
      retriever.ts              embed query + filtered search
      prompt.ts                 prompt builder, token budgeting
      llm.ts                    Groq client (streaming)
    jobs/
      queue.ts
      ingest.worker.ts
      email.worker.ts           sends verification, reset and notice emails with retry/backoff
    storage/
      r2.ts                     S3 client for R2, putObject, getObjectStream,
                                presignGet, deleteObject, deleteByPrefix
    mail/
      mailer.ts                 nodemailer transport configured for Mailtrap
      templates/                verify-email, reset-password, password-changed
                                (HTML + plain-text versions)
```

How the pieces fit:
- **Request path:** `routes` attach middlewares (`auth`, `validate`, `rateLimit`, ...) and point to a `controller` wrapped in `asyncHandler`. Controllers call `services`, then reply with `new ApiResponse(...)`.
- **Errors:** services and middlewares `throw new ApiError(404, "NOT_FOUND", "...")` using the codes in section 8. `error.middleware.ts` is the single place that turns them into the `{ error: { code, message, details } }` shape. Anything that is not an `ApiError` becomes `INTERNAL` (500) and is logged without message content.
- **Successes:** `ApiResponse` keeps success bodies uniform (e.g. `{ data, message }`). SSE endpoints bypass it and use `utils/sse.ts`.
- **Dependency direction:** routes -> controllers -> services -> models / rag / storage / mail. Controllers never touch models directly, and services never see `req` or `res`.

Run the API and the ingestion worker as separate processes (same codebase) so heavy parsing and embedding never block chat requests.

## 12. Frontend structure

```
client/src/
  api/             fetch wrapper (refresh-on-401), per-resource hooks
  features/
    auth/          LoginPage, RegisterPage, CheckInboxPage (with resend button + cooldown timer),
                   VerifyEmailPage (reads token, calls API, shows success/expired),
                   ForgotPasswordPage (email form, generic "check your inbox" message),
                   ResetPasswordPage (reads token, new password form, redirects to login), ProtectedRoute
    chats/         Sidebar (list, new, rename, delete)
    chat/          ChatView, MessageList, MessageBubble, Composer, SourcesPanel
    documents/     UploadDropzone, DocumentList (status badges)
  lib/             sse reader, zod schemas
  routes: /login  /register  /check-inbox  /verify-email  /forgot-password  /reset-password
          /chats  /chats/:chatId
```

UI behavior:
- Left sidebar with chats, main pane with messages, and a right panel (or drawer) listing this chat's documents with status and upload.
- Composer is disabled while a response is streaming and offers a Stop button (aborts the fetch).
- Assistant messages render markdown, with `[n]` citations that open the source snippet and page.
- Switching chats loads only that chat's messages and documents. Cache keys include `chatId`.
- Empty state in a new chat prompts the user to upload documents.

## 13. Configuration (env)

```
NODE_ENV, PORT, CLIENT_ORIGIN
MONGODB_URI
REDIS_URL
JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TTL, REFRESH_TTL
MAILTRAP_HOST, MAILTRAP_PORT, MAILTRAP_USER, MAILTRAP_PASS   (or MAILTRAP_API_TOKEN if using the SDK)
EMAIL_FROM, EMAIL_VERIFY_TTL=24h, PASSWORD_RESET_TTL=1h, EMAIL_RESEND_COOLDOWN_SEC=60
GROQ_API_KEY, GROQ_MODEL, GROQ_QUERY_REWRITE_MODEL
EMBEDDING_PROVIDER, EMBEDDING_MODEL, EMBEDDING_DIM, (provider API key if hosted)
QDRANT_URL, QDRANT_API_KEY, QDRANT_COLLECTION=kb_chunks
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
R2_BUCKET, R2_ENDPOINT (https://<ACCOUNT_ID>.r2.cloudflarestorage.com), R2_PRESIGN_TTL=300
MAX_UPLOAD_MB
RAG_TOP_K=6, RAG_MIN_SCORE, HISTORY_WINDOW=10, CHUNK_TOKENS=600, CHUNK_OVERLAP=80
```

## 14. Operational notes

- **Deletion consistency**: delete order is Qdrant points, then R2 objects (single delete, or delete by prefix `users/{userId}/chats/{chatId}/` for a whole chat), then Mongo records. If a step fails, keep the Mongo record marked `deleting` and retry from a cleanup job.
- **Idempotency**: ingestion deletes by `documentId` before upserting. Duplicate uploads are blocked by `contentHash` per chat.
- **Context budget**: Groq models have finite context windows. Budget roughly as system prompt + chunks (top-k x chunk size) + history + answer reserve, and trim history first, then reduce k.
- **Email**: in development and CI, point Mailtrap at the Email Testing sandbox so verification links can be read in its inbox, and in tests stub the mailer and capture the token it receives (the database only holds the hash). Before going live, add a verified sending domain in Mailtrap and switch the env variables. Log mail job IDs and delivery failures, never token values.
- **Observability**: request IDs, structured logs, and per-message metrics (retrieval ms, first-token ms, tokens).
- **Testing**: unit tests for the chunker and prompt builder, integration tests for isolation (a user must never get chunks from another chat or user), and a small fixed Q&A set to catch retrieval regressions.
- **Deployment**: API and worker containers, MongoDB Atlas, Qdrant (Docker for dev, Qdrant Cloud for prod), Redis, and the SPA on static hosting or behind the same reverse proxy.

## 15. Build order

1. Env/config, Mongo connection, error handling, zod validate middleware.
2. Auth (register, Mailtrap email verification, login, forgot/reset password, refresh rotation, me) and the protected-route frontend.
3. Chats CRUD and sidebar.
4. Document upload, queue, parse, chunk, embed, Qdrant upsert, status UI.
5. Messages with retrieval and non-streaming Groq call.
6. SSE streaming, sources panel, stop/regenerate.
7. Rate limits, deletion cascade, isolation tests, hardening.
8. Later: OCR for scans, hybrid search, reranking, shared document library.
