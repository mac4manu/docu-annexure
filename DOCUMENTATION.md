# DocuAnnexure - Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [System Flow](#system-flow)
5. [Document Processing Pipeline](#document-processing-pipeline)
6. [AI Chat System](#ai-chat-system)
7. [Metadata Extraction](#metadata-extraction)
8. [Confidence Scoring](#confidence-scoring)
9. [Authentication & Access Control](#authentication--access-control)
10. [Database Schema](#database-schema)
11. [Frontend Pages](#frontend-pages)
12. [API Routes](#api-routes)
13. [Admin Features](#admin-features)
14. [Security Measures](#security-measures)

---

## Overview

DocuAnnexure is a document analysis platform designed for scientific, medical, and academic use. Users upload documents (PDF, Word, PowerPoint, Excel), and the system extracts structured content using AI-powered vision and text processing. An AI chat interface allows users to ask questions about their documents, with support for multi-document conversations, confidence scoring, and response rating.

**Key Capabilities:**
- Upload and process PDF, DOCX, PPTX, and XLSX files
- AI vision-based extraction preserving tables, formulas, and figures
- AI-powered Q&A chat with streaming responses
- Automatic metadata extraction (DOI, authors, journal, keywords)
- Confidence scoring on AI responses
- User feedback via thumbs up/down ratings
- Admin analytics dashboard

---

## Architecture

```
+-------------------------------------------+
|              Frontend (React)              |
|  Vite + Tailwind CSS + shadcn/ui + wouter  |
+-------------------------------------------+
              |  HTTP / SSE
              v
+-------------------------------------------+
|           Backend (Express.js)             |
|  REST API + Streaming + Auth Middleware     |
+-------------------------------------------+
       |              |              |
       v              v              v
+-----------+  +-----------+  +-----------+
| PostgreSQL |  |  OpenAI   |  |  System   |
|  (Neon)   |  | GPT-5.2   |  |  Tools    |
| Drizzle   |  | Vision +  |  | pdftoppm  |
|   ORM     |  |   Chat    |  | pdftotext |
+-----------+  +-----------+  |LibreOffice|
                              +-----------+
```

**Data Flow:**

```
User -> Upload File -> Server validates -> Process by type:
  |
  +-- PDF ------> pdftotext (analyze complexity)
  |                |-- Simple? -> Text extraction + AI formatting
  |                |-- Complex? -> pdftoppm (images) -> GPT Vision -> Markdown
  |
  +-- DOCX -----> LibreOffice (DOCX->PDF) -> pdftoppm -> GPT Vision -> Markdown
  |                |-- Fallback: mammoth/officeParser -> AI formatting
  |
  +-- PPTX -----> officeParser -> AI formatting -> Markdown
  |
  +-- XLSX -----> officeParser -> Spreadsheet-to-Markdown formatting
  |
  +-- All ------> Extract metadata (DOI, title, authors) -> Save to DB
```

---

## Technology Stack

| Layer        | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | React, Vite, TypeScript                       |
| Styling     | Tailwind CSS, shadcn/ui components             |
| Routing     | wouter (client-side)                           |
| State       | TanStack React Query v5                        |
| Backend     | Express.js, TypeScript                         |
| Database    | PostgreSQL (Neon-backed), Drizzle ORM           |
| Auth        | Replit Auth (OpenID Connect), Passport.js       |
| Sessions    | express-session + connect-pg-simple             |
| AI Model    | OpenAI GPT-5.2 (via Replit AI Integrations)     |
| PDF Tools   | pdftoppm (poppler-utils), pdftotext             |
| Office Conv.| LibreOffice (headless), mammoth, officeParser   |
| Markdown    | react-markdown, remark-gfm, remark-math         |
| Math Render | rehype-katex, KaTeX                             |

---

## System Flow

### 1. User Authentication Flow

```
User visits app
    |
    +-- Not logged in --> Landing page with login button
    |
    +-- Clicks "Log in with Replit" --> Replit OAuth 2.0 flow
    |
    +-- Authenticated --> Check email allowlist
         |
         +-- Email allowed --> AuthenticatedApp (Documents, Chat, Metrics)
         |
         +-- Email not allowed --> "Access Restricted" page
```

### 2. Document Upload Flow

```
User drags/drops file into UploadZone
    |
    v
Frontend validates: file type (PDF/DOCX/PPTX/XLSX), max 50MB
    |
    v
POST /api/documents/upload (multipart form data)
    |
    v
Server checks:
  - User has < 20 documents (upload limit)
  - File signature matches declared MIME type (magic bytes)
    |
    v
Content extraction (type-dependent pipeline, see below)
    |
    v
Metadata extraction via GPT (DOI, title, authors, etc.)
    |
    v
Save document + metadata to PostgreSQL
    |
    v
Return document object to frontend
```

### 3. Chat Conversation Flow

```
User types question in chat input
    |
    v
POST /api/conversations/:id/messages
    |
    v
Server:
  1. Saves user message to DB
  2. Builds system context (domain expertise + document content)
  3. Sends to GPT-5.2 with streaming enabled
  4. Streams response chunks via Server-Sent Events (SSE)
  5. Saves complete AI response to DB
  6. Generates confidence score (separate GPT call)
  7. Updates message with confidence score
    |
    v
Frontend renders response in real-time as chunks arrive
```

---

## Document Processing Pipeline

### PDF Processing

The system uses a smart detection approach to choose between fast text extraction and thorough vision-based extraction:

**Step 1 - Analyze Complexity:**
- Extract raw text using `pdftotext`
- Check for table patterns (pipe characters, box-drawing characters)
- Check for math symbols (summation, integral, Greek letters, LaTeX commands)
- Measure text density per page

**Step 2 - Choose extraction method:**

| Condition | Method | Description |
|-----------|--------|-------------|
| Has tables, math, or low text density | Vision-based | pdftoppm converts pages to 120 DPI PNG images, then GPT-5.2 vision analyzes each image and outputs structured markdown |
| Simple text-heavy document | Text-based | pdftotext output is sent to GPT for lightweight markdown formatting |

**Vision Extraction Details:**
- Uses `pdftoppm` at 120 DPI to balance quality vs. speed
- Each page image is sent to GPT-5.2 with vision capability
- System prompt instructs GPT to output proper markdown with tables, LaTeX math, and image descriptions
- Pages are concatenated with `---` separators

### Word Document (DOCX) Processing

```
DOCX file
    |
    v
LibreOffice (headless) converts DOCX to PDF
    |
    v
PDF -> pdftoppm -> page images -> GPT Vision -> Markdown
    |
    +-- If LibreOffice unavailable or conversion fails:
         |
         v
         mammoth extracts HTML -> text
         OR officeParser extracts raw text
         -> GPT formats into markdown
```

### PowerPoint (PPTX) Processing

```
PPTX file -> officeParser extracts text -> GPT formats into markdown
```

### Excel (XLSX/XLS) Processing

```
Excel file -> officeParser extracts text -> formatExcelToMarkdown()
(Preserves spreadsheet structure as markdown tables)
```

---

## AI Chat System

### System Context Construction

Every AI response is built with a rich system context that includes:

1. **Domain Expertise** - Three specialized areas:
   - Scientific & Research (statistical methods, experimental design, LaTeX)
   - Health & Medical (clinical reports, evidence-based interpretation)
   - Education & Academic (textbook analysis, simplified explanations)

2. **Document Content** - The full extracted markdown content from:
   - Single document (in DocumentView chat)
   - Multiple selected documents (in Multi-Doc Chat)

3. **Response Guidelines:**
   - Use markdown formatting (headers, bold, lists, tables)
   - Use LaTeX for mathematical notation
   - Reference specific sections/pages from documents
   - Acknowledge limitations when content is ambiguous

### Streaming Implementation

- Backend uses `text/event-stream` content type (Server-Sent Events)
- Response chunks are sent as `data: {"content": "..."}\n\n`
- Frontend uses `ReadableStream` API to read chunks in real-time
- Final `data: [DONE]` signal marks end of stream
- Message is saved to database after stream completes

### Multi-Document Chat

- Users can select any combination of their uploaded documents
- All selected document contents are included in the system context
- Conversations track which documents were included (`documentIds` array)
- Past conversations can be resumed from the history drawer

---

## Metadata Extraction

When a document is uploaded, the system automatically extracts bibliographic metadata:

### DOI Detection (Two-Phase)

**Phase 1 - Regex:** Scans document text for DOI patterns:
- `doi: 10.xxxx/xxxxx`
- `https://doi.org/10.xxxx/xxxxx`
- Bare `10.xxxx/xxxxx` patterns

**Phase 2 - AI:** GPT analyzes the first 8,000 characters of document content and returns structured JSON with:

| Field | Description |
|-------|-------------|
| `doi` | Digital Object Identifier |
| `docTitle` | Actual paper/document title |
| `authors` | Comma-separated author names |
| `journal` | Journal or conference name |
| `publishYear` | Year of publication |
| `abstract` | Abstract text (up to 500 characters) |
| `keywords` | Comma-separated keywords |

The regex-detected DOI takes priority over the AI-detected one for reliability.

### Display

- Document cards on the home page show academic title, authors, and DOI badge
- Document view page has a collapsible metadata panel with all extracted fields
- Keywords displayed as individual badges
- DOI rendered as a clickable link to doi.org

---

## Confidence Scoring

After generating each AI response, the system evaluates its own confidence:

### Evaluation Criteria

| Factor | Impact |
|--------|--------|
| How well the response answers the question | Higher = more confident |
| Based on document content vs. general knowledge | Document-based = higher |
| Specificity and detail level | More specific = higher |
| Appropriate uncertainty acknowledgment | Acknowledging = higher |
| Hedging language ("I'm not sure", etc.) | More hedging = lower |

### Score Ranges

| Score | Color | Meaning |
|-------|-------|---------|
| 80-100% | Green | High confidence |
| 50-79% | Yellow | Moderate confidence |
| 0-49% | Red | Low confidence |

### Implementation

- A separate GPT call evaluates the question + response pair
- GPT returns a single integer (0-100)
- Score is stored in the `messages.confidenceScore` column
- Displayed as a color-coded badge on each AI response
- Aggregated in the Metrics page (personal and admin views)

---

## Authentication & Access Control

### Replit Auth (OpenID Connect)

- Uses Replit as the OAuth 2.0 / OpenID Connect provider
- Passport.js handles the authentication strategy
- Sessions stored in PostgreSQL via `connect-pg-simple`
- Token refresh handled automatically when sessions expire

### Email Allowlist

The app is in a **closed evaluation phase**. Only pre-approved email addresses can access the app. Unauthenticated users see a landing page, and authenticated users whose email isn't on the list see an "Access Restricted" page.

### Protected Routes

All API routes (except `/api/auth/*` and `/api/version`) use the `isAuthenticated` middleware which:
1. Verifies the user is authenticated
2. Checks their email against the allowlist
3. Ensures/creates the user record in the database
4. Refreshes tokens if expired

---

## Database Schema

### Tables

**users**
| Column | Type | Description |
|--------|------|-------------|
| id | varchar (PK) | User ID from Replit |
| email | varchar (unique) | User email |
| firstName | varchar | First name |
| lastName | varchar | Last name |
| profileImageUrl | varchar | Avatar URL |
| createdAt | timestamp | Account creation date |
| updatedAt | timestamp | Last update date |

**documents**
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-increment ID |
| title | text | Display title |
| originalFilename | text | Original uploaded filename |
| content | text | Extracted markdown content |
| fileType | text | pdf, doc, ppt, xlsx |
| userId | varchar | Owner user ID |
| doi | text | Digital Object Identifier |
| docTitle | text | Academic title |
| authors | text | Comma-separated authors |
| journal | text | Journal/conference name |
| publishYear | integer | Publication year |
| abstract | text | Document abstract |
| keywords | text | Comma-separated keywords |
| createdAt | timestamp | Upload date |

**conversations**
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-increment ID |
| title | text | Conversation title |
| documentId | integer | Single document reference |
| documentIds | integer[] | Multi-doc references |
| userId | varchar | Owner user ID |
| createdAt | timestamp | Creation date |

**messages**
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-increment ID |
| conversationId | integer (FK) | Parent conversation |
| role | text | "user" or "assistant" |
| content | text | Message content |
| confidenceScore | real | AI confidence (0-100) |
| createdAt | timestamp | Send date |

**message_ratings**
| Column | Type | Description |
|--------|------|-------------|
| id | serial (PK) | Auto-increment ID |
| messageId | integer (FK) | Rated message |
| rating | text | "thumbs_up" or "thumbs_down" |
| userId | varchar | Rater user ID |
| createdAt | timestamp | Rating date |

**sessions**
| Column | Type | Description |
|--------|------|-------------|
| sid | varchar (PK) | Session ID |
| sess | jsonb | Session data |
| expire | timestamp | Expiration time |

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Document library with upload zone, document cards, domain use case cards |
| `/document/:id` | DocumentView | Split-panel view: document content (left) + AI chat (right), resizable panels, metadata panel |
| `/chat` | MultiDocChat | Multi-document AI chat with document picker, prompt suggestions, chat history drawer |
| `/metrics` | Metrics | Analytics dashboard with upload stats, chat activity, confidence metrics, rating accuracy |
| `/how-to-use` | HowToUse | Step-by-step usage guide and FAQ |
| `/changelog` | Changelog | Version history and release notes timeline |

### Key Frontend Components

| Component | Purpose |
|-----------|---------|
| `UploadZone` | Drag-and-drop file upload with progress indicator |
| `DocumentCard` | Document preview card with title, authors, DOI badge |
| `ChatInterface` | Single-document AI chat with streaming, ratings, confidence |
| `MetadataPanel` | Collapsible card showing extracted DOI, authors, keywords |
| `VersionBanner` | Detects new deployments and prompts user to refresh |

---

## API Routes

### Documents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/documents` | List user's documents |
| GET | `/api/documents/:id` | Get single document |
| POST | `/api/documents/upload` | Upload and process document |
| DELETE | `/api/documents/:id` | Delete a document |

### Conversations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations` | List user's conversations |
| GET | `/api/conversations/:id` | Get conversation with messages |
| POST | `/api/conversations` | Create new conversation |
| DELETE | `/api/conversations/:id` | Delete conversation |

### Messages
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/conversations/:id/messages` | Send message and get AI response (streaming) |

### Ratings
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/messages/:id/rate` | Rate a message (thumbs up/down) |
| GET | `/api/ratings/metrics` | User's rating metrics |

### Metrics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/confidence/metrics` | User's confidence metrics |
| GET | `/api/admin/metrics` | Admin: all-user metrics |
| GET | `/api/admin/check` | Check if user is admin |
| GET | `/api/admin/ratings/metrics` | Admin: all-user rating metrics |
| GET | `/api/admin/confidence/metrics` | Admin: all-user confidence metrics |

### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/user` | Get current user |
| GET | `/api/login` | Initiate login |
| GET | `/api/callback` | OAuth callback |
| GET | `/api/logout` | Log out |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/version` | App version hash (for update detection) |

---

## Admin Features

- **Admin User:** Identified by a designated user ID configured on the server (not exposed publicly)
- **Admin Metrics Toggle:** On the Metrics page, the admin can switch between personal metrics and all-user aggregate metrics
- **Admin Endpoints:** Separate API routes provide platform-wide statistics including total documents, conversations, messages, ratings, and confidence scores across all users

---

## Security Measures

| Measure | Implementation |
|---------|---------------|
| Authentication | Replit OAuth 2.0 / OIDC via Passport.js |
| Authorization | Email allowlist for closed evaluation |
| Session Security | PostgreSQL-backed sessions, secure cookies |
| File Validation | Magic byte signature verification before processing |
| Upload Limits | 50 MB file size, 20 documents per user |
| Route Protection | `isAuthenticated` middleware on all API routes |
| Input Validation | Zod schemas for request body validation |
| Token Refresh | Automatic OAuth token refresh on expiry |
| User Isolation | All queries filtered by authenticated user ID |

---

*Last updated: February 16, 2026*
