## What is DocuAnnexure?
DocuAnnexure is an AI-powered document intelligence platform designed to transform static files into interactive knowledge bases. It specifically targets the "heavy lifting" associated with complex documents like scientific papers, technical manuals.
At its core, it is a Document Inference & Chat application. Unlike standard PDF readers, it uses AI vision and Large Language Models (LLMs) to "read" and understand the layout and context of your files.

Multimodal Extraction: It doesn't just scrape text; it identifies and extracts tables, formulas, and images, converting them into structured Markdown.

Centralized Knowledge: You can upload multiple documents (PDF, Word, or PowerPoint) and treat them as a single, searchable database.

Context-Aware Interface: The app features a dual-pane layout where you can view your document on one side and chat with an AI assistant on the other.

## How it Helps with Scientific Documents
Scientific papers are notoriously difficult for standard AI because they rely heavily on non-textual data. DocuAnnexure addresses these pain points specifically:   

Formula & Notation Accuracy: Because the app uses AI-powered vision to extract content, it can recognize complex mathematical equations and scientific notations that often get "garbled" by traditional Copy-Paste or basic OCR.

Data Extraction from Tables: Scientific results are often buried in dense tables. DocuAnnexure extracts these into structured formats, making it easier to ask the AI to "summarize the results in Table 3" or "compare the p-values across different trials."

Cross-Reference Analysis: If you are conducting a literature review, you can upload dozens of papers. The AI can then find connections between them, such as identifying if a methodology in Paper A contradicts a finding in Paper B.

Citations and Grounding: To prevent "hallucinations" (AI making things up), the system provides proper citations. When it answers a question about a specific theorem or data point, it points you back to the exact section of the source document.

## The Chat Experience
The chat functionality acts as a Research Assistant rather than just a search bar. You can use it to:

Simplify Complex Jargon: Ask the AI to "Explain the 'Methods' section of this paper as if I'm a first-year grad student."

Instant Summarization: Get a high-level overview of a 50-page technical annexure in seconds.

Deep Querying: Instead of searching for keywords, you can ask conceptual questions like, "What are the primary limitations the authors identified in their experimental setup?"

---

## Local Setup Guide

### Prerequisites

Before running DocuAnnexure locally, make sure you have the following installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | v20+ | JavaScript runtime |
| npm | v9+ | Package manager (comes with Node.js) |
| PostgreSQL | v14+ | Database |
| poppler-utils | Latest | PDF processing (`pdftoppm`, `pdftotext`) |
| LibreOffice | Latest | Word document to PDF conversion (optional, used for DOCX vision extraction) |

**Installing system dependencies:**

On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install poppler-utils libreoffice-core
```

On macOS (using Homebrew):
```bash
brew install poppler
brew install --cask libreoffice
```

On NixOS/Replit:
```
poppler_utils and libreoffice are already configured in the environment.
```

### Step 1: Clone the Repository

```bash
git clone <your-repo-url>
cd docuannexure
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

### Step 3: Set Up the Database

Create a PostgreSQL database and note the connection URL.

```bash
# Example: create a local database
createdb docuannexure
```

### Step 4: Configure Environment Variables

Create a `.env` file in the project root (or set these as system environment variables):

```env
DATABASE_URL=postgresql://username:password@localhost:5432/docuannexure
SESSION_SECRET=any-random-string-for-signing-sessions
OPENAI_API_KEY=your-openai-api-key
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Random string used to sign session cookies |
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-5.2 (vision + chat) |

> **Note:** On Replit, the OpenAI key is provided automatically via the built-in AI integration. For local development, you need your own key.

### Step 5: Push the Database Schema

This creates all the required tables in your PostgreSQL database:

```bash
npm run db:push
```

This uses Drizzle ORM to sync the schema defined in `shared/schema.ts` to your database. No manual SQL migrations are needed.

### Step 6: Start the Development Server

```bash
npm run dev
```

This starts:
- Express.js backend on port 5000
- Vite dev server (frontend) proxied through the same port

Open your browser and go to: **http://localhost:5000**

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server (backend + frontend) |
| `npm run build` | Build the production bundle |
| `npm start` | Run the production build |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push database schema changes to PostgreSQL |

---

## Project Structure

```
docuannexure/
├── client/                    # Frontend (React + Vite)
│   └── src/
│       ├── components/        # Reusable UI components
│       │   └── ui/            # shadcn/ui base components
│       ├── hooks/             # Custom React hooks
│       ├── lib/               # Utility functions
│       ├── pages/             # Page components (Home, Chat, Metrics, etc.)
│       ├── App.tsx            # Root app with routing and auth guard
│       └── index.css          # Global styles and Tailwind config
├── server/                    # Backend (Express.js)
│   ├── replit_integrations/   # Auth module (Replit OAuth)
│   │   └── auth/
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # All API route handlers
│   ├── storage.ts             # Database storage interface
│   └── vite.ts                # Vite dev server integration
├── shared/                    # Shared between frontend and backend
│   ├── models/                # Drizzle ORM table definitions
│   │   ├── auth.ts            # Users and sessions tables
│   │   ├── chat.ts            # Conversations, messages, ratings tables
│   │   └── document.ts        # Documents table
│   ├── schema.ts              # Aggregated schema exports
│   └── routes.ts              # Shared API route path definitions
├── migrations/                # Database migration files (auto-generated)
├── uploads/                   # Temporary file upload directory (auto-created)
├── drizzle.config.ts          # Drizzle ORM configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── vite.config.ts             # Vite build configuration
├── DOCUMENTATION.md           # Detailed technical documentation
└── README.md                  # This file
```

---

## Testing Locally

### Manual Testing Workflow

1. **Start the dev server:** `npm run dev`
2. **Open the app:** Navigate to `http://localhost:5000`
3. **Authentication:** The app uses Replit Auth by default. For local testing without Replit:
   - You may need to modify the auth middleware to bypass authentication, or
   - Set up a local OpenID Connect provider
   - Alternatively, temporarily disable the `isAuthenticated` middleware in `server/routes.ts` for development purposes

### Testing Document Upload

1. Navigate to the Home page
2. Drag and drop a PDF, DOCX, PPTX, or XLSX file into the upload area
3. Wait for processing to complete (complex PDFs with tables/math may take longer)
4. Verify the document appears in your library with extracted metadata (title, authors, DOI if applicable)

### Testing AI Chat

1. Click on any uploaded document to open the Document View
2. Type a question about the document in the chat panel on the right
3. Verify the AI responds with streaming text, referencing specific document content
4. Check that the confidence score badge appears after the response completes

### Testing Multi-Document Chat

1. Navigate to the Chat tab in the header
2. Select multiple documents from the document picker
3. Ask a question that spans across the selected documents
4. Verify the AI can reference content from all selected documents

### Type Checking

Run the TypeScript compiler to check for type errors across the codebase:

```bash
npm run check
```

### Database Inspection

You can connect to your local PostgreSQL database directly to inspect data:

```bash
psql $DATABASE_URL
```

Useful queries:
```sql
-- Check uploaded documents
SELECT id, title, "file_type", "doc_title", authors FROM documents;

-- Check conversations and message counts
SELECT c.id, c.title, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id, c.title;

-- Check confidence scores
SELECT AVG(confidence_score) as avg_confidence
FROM messages
WHERE role = 'assistant' AND confidence_score IS NOT NULL;
```

---

## Building for Production

```bash
# Build the frontend and backend
npm run build

# Start the production server
npm start
```

The production build serves the compiled frontend from the `dist/` directory and runs the Express server in production mode.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `pdftotext: command not found` | Install poppler-utils (`sudo apt install poppler-utils` or `brew install poppler`) |
| `pdftoppm: command not found` | Same as above, poppler-utils includes both tools |
| `soffice: command not found` | Install LibreOffice for DOCX vision extraction (app will fall back to text extraction without it) |
| Database connection errors | Verify `DATABASE_URL` is correct and PostgreSQL is running |
| OpenAI API errors | Check that your API key is valid and has access to the GPT model |
| Port 5000 already in use | Stop any other process using port 5000, or modify the port in `server/index.ts` |
| `npm run db:push` fails | Ensure `DATABASE_URL` is set and the database exists |

---

## Further Reading

- [DOCUMENTATION.md](./DOCUMENTATION.md) - Detailed technical documentation covering architecture, system flows, database schema, API routes, and security measures
