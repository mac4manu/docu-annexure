# Document Analysis Application

## Overview
A document analysis app that accepts PDF, PowerPoint, and Word files, extracts rich content (tables, formulas, images) using AI vision, and provides an AI-powered chat interface for Q&A about document content.

## Architecture
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, wouter routing
- **Backend**: Express.js, PostgreSQL + Drizzle ORM
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (vision for PDF extraction, chat for Q&A)
- **Document Processing**: 
  - PDF: pdftoppm (poppler-utils) converts pages to PNG images -> GPT vision extracts markdown
  - DOCX/PPTX: officeparser extracts text -> GPT formats into structured markdown
  - Output includes proper markdown tables, LaTeX math formulas, and image descriptions

## Key Files
- `server/routes.ts` - API routes including file upload, vision-based extraction, and streaming chat
- `shared/schema.ts` - Database schema (documents, conversations, messages)
- `shared/routes.ts` - Shared API route definitions
- `server/storage.ts` - Database storage interface
- `client/src/pages/DocumentView.tsx` - Document viewer with markdown rendering and chat panel
- `client/src/components/ChatInterface.tsx` - AI chat with streaming responses
- `client/src/components/UploadZone.tsx` - Drag-and-drop file upload

## Recent Changes
- 2026-02-09: Replaced pdf-parse with vision-based extraction using pdftoppm + GPT-5.2
- 2026-02-09: Added remark-gfm, remark-math, rehype-katex for table/formula rendering
- 2026-02-09: Fixed download button bug (was using `document` instead of `window.document`)

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
- PostgreSQL via DATABASE_URL env var
