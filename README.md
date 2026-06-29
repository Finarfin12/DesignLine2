<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://placehold.co/120x120/6366f1/ffffff?text=DL&font=source-sans-pro">
    <img alt="DesignLine" src="https://placehold.co/120x120/6366f1/ffffff?text=DL&font=source-sans-pro" width="120">
  </picture>
</p>

<h1 align="center">DesignLine — Workflow Hub</h1>

<p align="center">
  <strong>All-in-one workspace for graphic designers.</strong>
  <br>
  Project management, brand kit library, digital asset management, moodboards,
  <br>color palette extraction, invoicing, client briefs, and email delivery.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT">
  <img src="https://img.shields.io/badge/stack-React%20%7C%20Express%20%7C%20PostgreSQL-6366f1" alt="Stack">
  <img src="https://img.shields.io/badge/types-TypeScript-3178C6" alt="TypeScript">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status">
</p>

---

## Features

| Module | Description |
|--------|-------------|
| **Project Management** | Track status, deadlines, briefs, task lists, and invoices per project |
| **Brand Kit** | Manage logos, colors, fonts, and brand guidelines in one place |
| **Digital Assets** | Upload, tag, version, and license design files (images, fonts, templates) |
| **Moodboard** | Drag-and-drop visual reference board with lightbox detail view |
| **Ideate** | Rich text notes with full formatting toolbar, image upload, and link support |
| **Color Palette Generator** | Extract color palettes from images automatically |
| **Email Sender** | Professional email templates delivered via Gmail SMTP / Mailpit |
| **Global Search** | Fast search across projects, clients, brands, and assets |
| **Dashboard** | Overview with project stats, asset count, and recent activity |
| **Client Directory** | Manage client contacts with project history |

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript 6, Vite 8, Tailwind CSS 3, Zustand, TanStack Query |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Zod |
| **Database** | PostgreSQL 16 |
| **Email** | Nodemailer (Gmail SMTP) / Mailpit (dev) / Resend (alternative) |
| **Storage** | Local disk (dev) / Cloudflare R2 (production) |
| **Rich Text** | TipTap (ProseMirror) with image upload |

## Quick Start

**Prerequisites:** [Node.js 18+](https://nodejs.org), [Docker](https://docker.com), [Git](https://git-scm.com).

```bash
# 1. Clone
git clone https://github.com/Finarfin12/DesignLine2.git
cd DesignLine2

# 2. One-command setup (env, database, dependencies, migrations)
chmod +x install.sh && ./install.sh
# or on Windows:
# powershell -ExecutionPolicy Bypass -File install.ps1

# 3. Start development
cd server && npm run dev &
cd client && npm run dev
```

Open **http://localhost:5173** — register a new account and start.

### Manual Setup

**Terminal 1 — Database & Mailpit:**
```bash
docker compose up -d
```

**Terminal 2 — Backend:**
```bash
cd server
cp .env.example .env
npm install
npx prisma generate && npx prisma migrate dev
npm run dev
```

**Terminal 3 — Frontend:**
```bash
cd client
npm install
npm run dev
```

### Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `JWT_SECRET` | (required) | Secret key for JWT token signing |
| `EMAIL_MODE` | `mailhog` | `mailhog` (dev) / `gmail` (production) / `resend` |
| `CLIENT_URL` | `http://localhost:5173` | Frontend URL (used for CORS and email links) |
| `R2_ENDPOINT` | (optional) | Cloudflare R2 endpoint for production storage |
| `R2_ACCESS_KEY` | (optional) | Cloudflare R2 access key |
| `R2_SECRET_KEY` | (optional) | Cloudflare R2 secret key |

### Important URLs

| Service | URL |
|---------|-----|
| Application | http://localhost:5173 |
| API | http://localhost:3001 |
| Mailpit UI | http://localhost:8025 |
| Prisma Studio | `cd server && npx prisma studio` |

## API Documentation

All API endpoints run at `http://localhost:3001/api`.  
Authenticated endpoints require the header `Authorization: Bearer <token>`.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new account |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/forgot` | Request password reset email |
| `POST` | `/api/auth/reset` | Reset password with token |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:id` | Get project details |
| `PUT` | `/api/projects/:id` | Update a project |
| `DELETE` | `/api/projects/:id` | Delete a project |
| `POST` | `/api/projects/:id/tasks` | Add a task to a project |
| `PUT` | `/api/projects/:id/tasks/:taskId` | Update a task |
| `DELETE` | `/api/projects/:id/tasks/:taskId` | Delete a task |

### Brands

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/brands` | List all brands |
| `POST` | `/api/brands` | Create a brand |
| `GET` | `/api/brands/:id` | Get brand details |
| `PUT` | `/api/brands/:id` | Update a brand |
| `DELETE` | `/api/brands/:id` | Delete a brand |

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assets` | List assets (filter by `type`, `brandId`, `search`, `page`, `limit`) |
| `POST` | `/api/assets` | Upload a new asset (multipart form) |
| `POST` | `/api/assets/link` | Create an asset link (no file upload) |
| `GET` | `/api/assets/:id` | Get asset details |
| `PUT` | `/api/assets/:id` | Update asset metadata |
| `DELETE` | `/api/assets/:id` | Delete an asset |
| `POST` | `/api/assets/upload-image` | Upload inline image for editor (returns URL only) |

### Clients

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/clients` | List all clients |
| `POST` | `/api/clients` | Create a client |
| `PUT` | `/api/clients/:id` | Update a client |
| `DELETE` | `/api/clients/:id` | Delete a client |

### Email

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/email/templates` | List email templates |
| `POST` | `/api/email/templates` | Create an email template |
| `POST` | `/api/email/send` | Send an email |
| `POST` | `/api/email/preview` | Preview rendered email template |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search?q=...` | Global search across projects, clients, brands, assets |

### Asset Types

The `type` field on assets supports: `font`, `color`, `template`, `icon`, `image`, `mockup`, `palette`, `moodboard`.

## Project Structure

```
designline/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/              # Sidebar, MainLayout, ProtectedRoute
│   │   │   ├── RichTextEditor.tsx   # TipTap rich text editor
│   │   │   └── ErrorBoundary.tsx
│   │   ├── lib/
│   │   │   ├── api.ts               # Axios instance + interceptors
│   │   │   └── alert.ts             # SweetAlert2 helpers
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Overview with stats
│   │   │   ├── Projects.tsx         # Project list
│   │   │   ├── ProjectDetail.tsx    # Single project with tasks
│   │   │   ├── Moodboard.tsx        # Drag-and-drop visual board
│   │   │   ├── Ideate.tsx           # Rich text notes
│   │   │   ├── Assets.tsx           # Asset library with grid view
│   │   │   ├── ColorPalette.tsx     # Color extraction tool
│   │   │   ├── Brands.tsx           # Brand kit list
│   │   │   ├── BrandDetail.tsx      # Single brand detail
│   │   │   ├── Clients.tsx          # Client directory
│   │   │   ├── Email.tsx            # Email sender
│   │   │   ├── Timeline.tsx         # Project timeline
│   │   │   ├── Archive.tsx          # Archived projects
│   │   │   ├── Settings.tsx         # User settings
│   │   │   ├── Login.tsx / Register.tsx
│   │   │   ├── ForgotPassword.tsx / ResetPassword.tsx
│   │   │   └── PresentationMode.tsx # Client-facing project view
│   │   └── stores/
│   │       └── authStore.ts         # Zustand auth state
│   └── package.json
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts              # Auth endpoints
│   │   │   ├── projects.ts          # Project CRUD + tasks
│   │   │   ├── brands.ts            # Brand CRUD
│   │   │   ├── assets.ts            # Asset CRUD + upload
│   │   │   ├── clients.ts           # Client CRUD
│   │   │   ├── emails.ts            # Email templates + send
│   │   │   └── search.ts            # Global search
│   │   ├── middleware/
│   │   │   ├── auth.ts              # JWT authentication
│   │   │   ├── upload.ts            # Multer config + file processing
│   │   │   └── errorHandler.ts      # Error handling
│   │   ├── services/
│   │   │   ├── emailService.ts      # Email sending (Gmail/Resend/Mailpit)
│   │   │   ├── storageService.ts    # File storage (disk/R2)
│   │   │   └── emailTemplate.ts     # Email HTML template engine
│   │   ├── config/
│   │   │   ├── database.ts          # Prisma client
│   │   │   └── env.ts               # Environment config
│   │   └── index.ts                 # Express app entry
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   └── migrations/              # Migration history
│   └── package.json
│
├── docker-compose.yml               # PostgreSQL 16 + Mailpit
├── install.sh                       # Bash setup script
├── install.ps1                      # PowerShell setup script
├── .gitignore
├── .env.example
├── LICENSE                          # MIT
└── README.md
```

## Available Scripts

### Root

| Script | Description |
|--------|-------------|
| `npm run install:all` | Install dependencies for both client and server |
| `npm run dev:server` | Start the server in dev mode |
| `npm run dev:client` | Start the client dev server |
| `npm run db:migrate` | Run Prisma migrations |

### Server (`cd server`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with `tsx watch` (hot reload) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled production build |
| `npx prisma studio` | Open database GUI |

### Client (`cd client`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite development server |
| `npm run build` | Production build to `dist/` |
| `npx tsc --noEmit` | Type-check without emitting |

## Troubleshooting

### "Invalid file type" on upload
The upload middleware accepts a wide range of file types (images, fonts, documents, archives, video, audio). If you encounter this error, check the file extension matches the actual MIME type.

### Database connection refused
Ensure Docker is running and PostgreSQL is up:
```bash
docker compose ps
docker compose logs postgres
```

### Email sending fails
- In dev mode, Mailpit captures all emails — check `http://localhost:8025`
- For Gmail SMTP, enable [App Passwords](https://support.google.com/accounts/answer/185833) if 2FA is enabled
- Set `EMAIL_MODE=gmail` and configure `GMAIL_USER` / `GMAIL_PASS` in `.env`

### "Token expired" after long inactivity
Log out and log in again. JWT tokens expire after 7 days by default.

## Deployment

DesignLine is production-ready with:

- **File Storage:** Cloudflare R2 (set `R2_*` environment variables)
- **Email:** Gmail SMTP (`EMAIL_MODE=gmail`) or Resend API
- **Frontend Build:** `cd client && npm run build` → output in `client/dist/`
- **Production Server:**
  ```bash
  cd server
  NODE_ENV=production npm run build && npm start
  ```

Serving the frontend build via the Express server is recommended for production to avoid CORS issues. Configure the static file path in `server/src/index.ts` to point to `../client/dist`.

## License

[MIT](LICENSE) © 2026 DesignLine
