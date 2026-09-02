# SmartRoad security

This document lists the security controls that are implemented, where they live, and the threats that were considered. Limits are stated in `docs/limitations.md`; nothing here is aspirational.

## 1. Authentication and authorisation

```mermaid
sequenceDiagram
    participant SPA as React SPA
    participant API as Express API
    participant DB as MongoDB

    SPA->>API: POST /api/auth/login { email, password }
    API->>DB: find user by email (hash selected explicitly)
    API->>API: bcrypt.compare(password, passwordHash)
    alt invalid
        API-->>SPA: 401 INVALID_CREDENTIALS (same message for unknown email and wrong password)
    else deactivated
        API-->>SPA: 403 FORBIDDEN
    else valid
        API->>API: sign JWT { sub: userId, role } HS256, expiry JWT_EXPIRES_IN
        API-->>SPA: 200 { token, user }
        SPA->>SPA: store the token, set AuthContext
    end
    SPA->>API: later requests: Authorization: Bearer <token>
    API->>DB: load user by id (primary key) to confirm isActive and the current role
    API->>API: verify signature and expiry; 401 or 403 when needed
```

| Control | Implementation |
|---|---|
| Password hashing | bcryptjs with cost `BCRYPT_ROUNDS` (default 10). `User.hashPassword()` refuses passwords shorter than 8 or longer than 72 characters (bcrypt ignores bytes beyond 72). The schema stores only `passwordHash` with `select: false`; only the login lookup selects it. Passwords are never logged. |
| Token | `jsonwebtoken`, algorithm pinned to HS256 on verification, secret `JWT_SECRET` validated at start-up to be at least 32 characters, expiry `JWT_EXPIRES_IN` (default 24 h), subject = user id, role claim for display only. |
| Session validity | `requireAuth` loads the user by id on every request. Deactivated accounts (`isActive: false`) and deleted users are rejected immediately, and role changes take effect without waiting for token expiry. |
| Optional auth | `optionalAuth` on the public map endpoint: an invalid or expired token is still an error so a stale session is never silently downgraded to anonymous access. |
| Role checks | `requireRole("admin")` on every admin route (full incident list, status, priority, delete, analytics summary/breakdown/timeline, hotspots, every `/api/ml/*` route, user management). Ownership checks for citizen edits happen in the incident service, not in the client. |
| Self-protection | An administrator cannot change their own role or deactivate their own account. |
| Registration | Always creates a `citizen`; a `role` field in the body is ignored. Administrators are created by the seed script or the `create-admin` script only. |
| Logout | The SPA discards the token. Tokens are stateless; there is no server-side revocation list (see limitations). |

## 2. Input validation and injection

- Every write and every query string is validated with zod schemas (`backend/src/validation/`) through the `validate()` middleware. Schemas accept only primitive types where primitives are expected, so an object such as `{ "$gt": "" }` never reaches a Mongoose query; this replaces `express-mongo-sanitize`, which does not work with Express 5.
- Unknown body fields are stripped. `status` and `priority` in an incident edit are rejected explicitly so a client bug is not hidden.
- ObjectIds in URLs are checked before any query; malformed ids return 400.
- Free-text search escapes regex metacharacters before building the case-insensitive pattern.
- Coordinates are range-checked on the client, in zod, and again in the Mongoose schema.
- Enum values (category, status, severity, priority, risk level, feature values for the ML form) are checked against the single vocabulary in `backend/src/config/enums.ts`, `categories.ts` and the ML feature schema.
- The JSON body limit is 100 kB; multipart uploads are limited separately.

## 3. File uploads

| Control | Implementation |
|---|---|
| Memory first | multer memory storage, so nothing is written to disk before the checks pass. |
| Size | `MAX_UPLOAD_MB` (default 5) enforced by multer; oversize gives 413 `UPLOAD_TOO_LARGE`. |
| Type | Allow-list `image/jpeg`, `image/png`, `image/webp` checked by magic bytes with `file-type`, not by the client MIME type or extension; otherwise 415 `UNSUPPORTED_FILE_TYPE`. |
| Names | Server-generated random file names with the extension derived from the detected type; the client file name is never used. |
| Storage | `backend/uploads/` (git-ignored) through a storage adapter that resolves paths inside the upload directory only. |
| Serving | `GET /uploads/:filename` serves only files with image extensions, with directory listing and dotfiles disabled, `X-Content-Type-Options: nosniff` and a `Cross-Origin-Resource-Policy: cross-origin` header so the SPA on another origin can display images. No script can execute from that path. |
| Lifecycle | Replacing or removing an image deletes the old file; deleting an incident deletes its image. |
| Not done | Images are not re-encoded, so EXIF metadata is preserved (limitations). |

## 4. HTTP hardening

- `helmet` default headers (content type sniffing, frame options, referrer policy, and others).
- CORS restricted to origins in `CORS_ORIGIN`; requests without an Origin header (curl, tests) are allowed; methods and headers are listed explicitly.
- Rate limiting with `express-rate-limit`: login and register (default 10 per 15 minutes per IP), incident creation (default 20 per hour per user), and a global limit (default 300 per 15 minutes per IP). `TRUST_PROXY=1` makes the limiter see the client address behind a reverse proxy.
- `x-powered-by` disabled.
- The error handler returns the standard envelope; unexpected errors are logged with their stack on the server and reported as `INTERNAL_ERROR` without details in production.

## 5. Secrets and configuration

- All secrets come from environment variables validated at start-up (`backend/src/config/env.ts`); a missing or short `JWT_SECRET` stops the process with a readable message.
- `.env` files are git-ignored; `.env.example` files contain placeholders only. The demo accounts created by the seed script use passwords from `.env` and are documented as demo accounts.
- The ML service is protected by a shared `X-API-Key` (`ML_SERVICE_API_KEY` on the backend, `ML_API_KEY` on the service). When both are empty (local development) the check is skipped and the service logs a warning. In deployment the ML service binds to a private address and is not exposed to the internet.

## 6. Privacy

- Reporter identity (name, email) is visible only to administrators and to the reporter; the serializer removes it for everyone else, on the server, so a client cannot request it.
- Administrator identities on history entries are visible to administrators only.
- Rejected incidents are hidden from the public map and from other citizens.
- The upload form warns users not to photograph people or number plates.
- No location tracking beyond the coordinates the user submits.

## 7. Threats considered

| Threat | Handling |
|---|---|
| Brute-force login | Rate limiting, bcrypt cost, identical message for unknown user and wrong password. |
| Privilege escalation by editing the client | Roles come from the database on every request; the client role only hides menus. |
| Spam or abusive reports | Registration required, per-user report limit, admin rejection with reason, admin delete, account deactivation. |
| Malicious upload | Magic-byte check, size limit, random name, image-only static route, no execution. |
| NoSQL injection | zod primitive-only schemas, regex escaping. |
| Cross-site scripting | React escaping, no `dangerouslySetInnerHTML`, no third-party scripts; token exposure risk documented. |
| Leaking reporter identity | Privacy variants applied in the serializer. |
| Secrets in git | `.gitignore`, `.env.example`, review of `git status` before commits. |
| ML service abuse | Shared API key, private network address, request size caps (5000 batch items, 20000 hotspot points). |
| Not covered | DDoS, account recovery, two-factor authentication, audit of admin actions beyond the incident history, CSRF (no cookies are used). |
