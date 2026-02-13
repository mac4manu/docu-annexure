# DocuAnnexure - Document Analysis Application

## Overview
DocuAnnexure is a central hub for document inference and chat-driven access to internal knowledge. It accepts PDF, PowerPoint, and Word files, extracts rich content (tables, formulas, images) using AI vision, and provides an AI-powered chat interface for Q&A about document content.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, wouter routing
- **Backend**: Express.js, PostgreSQL + Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect) via passport, session-based with PostgreSQL session store
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (vision for PDF extraction, chat for Q&A)
- **Document Processing**: 
  - PDF: pdftoppm (poppler-utils) converts pages to PNG images -> GPT vision extracts markdown
  - DOCX/PPTX: officeparser extracts text -> GPT formats into structured markdown
  - Output includes proper markdown tables, LaTeX math formulas, and image descriptions

## Key Files
- `server/routes.ts` - API routes (all protected with isAuthenticated middleware)
- `server/index.ts` - Server setup, auth wired before routes via setupAuth + registerAuthRoutes
- `server/replit_integrations/auth/` - Auth module (replitAuth.ts, storage.ts, routes.ts)
- `shared/schema.ts` - Database schema (documents, conversations, messages, users, sessions)
- `shared/models/auth.ts` - Auth schema (users, sessions tables)
- `shared/models/chat.ts` - Chat schema with documentIds array for multi-doc conversations
- `shared/routes.ts` - Shared API route definitions
- `server/storage.ts` - Database storage interface with metrics aggregation
- `client/src/App.tsx` - Root app with auth guard: Landing for logged-out, AuthenticatedApp for logged-in
- `client/src/pages/Landing.tsx` - Landing page with hero, features, login CTA
- `client/src/pages/Home.tsx` - Document library (authenticated)
- `client/src/pages/DocumentView.tsx` - Document viewer with markdown rendering and chat panel
- `client/src/pages/MultiDocChat.tsx` - Multi-document chat with document selection, chat history sidebar
- `client/src/pages/Metrics.tsx` - Analytics dashboard with stats, charts, and activity tracking
- `client/src/hooks/use-auth.ts` - React hook for authentication state
- `client/src/components/ChatInterface.tsx` - AI chat with streaming responses
- `client/src/components/UploadZone.tsx` - Drag-and-drop file upload

## Recent Changes
- 2026-02-09: Added Replit Auth with landing page, user profile/logout in header, protected API routes
- 2026-02-09: Added Metrics page at /metrics with stat cards, bar chart, pie chart, and recent activity
- 2026-02-09: Added chat history to multi-doc chat (load, delete past conversations)
- 2026-02-09: Removed sidebar, switched to header-based navigation (Documents, Chat, Metrics tabs)
- 2026-02-09: Made branding more prominent with larger title and always-visible tagline
- 2026-02-09: Fixed bug where documents couldn't be changed mid-chat
- 2026-02-09: Added multi-document chat feature at /chat route
- 2026-02-09: Replaced pdf-parse with vision-based extraction using pdftoppm + GPT-5.2
- 2026-02-09: Added remark-gfm, remark-math, rehype-katex for table/formula rendering
- 2026-02-13: Optimized document upload speed: lower DPI (120), skip AI formatting for simple text PDFs/Office docs
- 2026-02-13: Added "How to Use" page at /how-to-use with step-by-step guide and FAQ

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
- PostgreSQL via DATABASE_URL env var
