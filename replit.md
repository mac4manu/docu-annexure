# DocuAnnexure - Document Analysis Application

## Overview
DocuAnnexure is a document analysis and chat application designed to be a central hub for internal knowledge access. It enables users to upload various document types (PDF, PowerPoint, Word, Excel), extract rich content using AI vision, and interact with the content through an AI-powered chat interface. The system leverages Retrieval-Augmented Generation (RAG) with local vector embeddings to provide intelligent and context-aware responses. Key capabilities include PII detection and redaction, advanced metadata extraction for various domains (academic, real estate), and comprehensive analytics. The project aims to streamline information retrieval, enhance document understanding, and offer a secure, intelligent knowledge management solution.

## System Architecture
**Frontend**: Built with React + Vite, styled using Tailwind CSS and shadcn/ui components, utilizing wouter for routing. Key pages include a Landing Page, Document Library, Document Viewer with an integrated chat panel, a Multi-Document Chat interface, an Analytics Dashboard, and administrative User Management.

**Backend**: Implemented with Express.js, using PostgreSQL and Drizzle ORM for data persistence. It handles API routes, user authentication, file uploads, chat engine operations, and RAG processing. Server-Sent Events (SSE) are used for streaming responses.

**Authentication**: Uses Replit Auth (OpenID Connect) via Passport.js, with session-based authentication stored in PostgreSQL. An email allowlist mechanism controls access for a closed evaluation phase.

**AI Integration**: Utilizes OpenAI GPT-5.2 models through Replit AI Integrations for:
-   **Vision**: PDF/DOCX content extraction (tables, formulas, images).
-   **Chat**: Q&A with a "Professor" persona for intelligent responses.
-   **Confidence Scoring**: Evaluating the AI's response confidence (0-100%).
-   **Metadata Extraction**: Identifying document details like DOI, authors, and domain-specific metadata (e.g., real estate properties).

**RAG System**:
-   **Chunking**: Documents are split into approximately 4500-character chunks with 600-character overlap, employing math-aware splitting to preserve LaTeX formulas. PII detection and redaction occur before chunking.
-   **Embedding**: Uses the `all-MiniLM-L6-v2` local embedding model (via `@xenova/transformers`) to generate 384-dimensional vectors.
-   **Vector Storage & Search**: `pgvector` extension in PostgreSQL stores embeddings, leveraging an HNSW index for efficient cosine similarity search to retrieve top-K relevant chunks for RAG.
-   **Fallback**: If a document is not yet indexed, the chat system can fall back to using the full document content.

**Document Processing**:
-   **PDF**: `pdftoppm` converts PDFs to PNG images, which are then processed by GPT-5.2 Vision for markdown extraction (5 pages per batch).
-   **DOCX**: LibreOffice converts DOCX to PDF, then follows the PDF vision pipeline.
-   **PPTX**: `officeParser` extracts text, and GPT formats it into structured markdown.
-   **XLSX**: `officeParser` parses spreadsheets and formats them into markdown tables.
-   **PII Redaction**: Regex and AI redaction run in parallel; regex is re-applied on AI output for full coverage.
-   **Performance**: Embeddings generated in parallel batches of 8; DB chunk inserts batched 20 rows per query.
-   Output includes proper markdown tables, LaTeX math formulas (with client-side `KaTeX` rendering and LaTeX preprocessing), and image descriptions.

**System Design**:
-   **Data Model**: Includes schemas for documents, document chunks, conversations, messages, users, sessions, message ratings, allowed emails, and testimonials.
-   **Security**: All API routes are protected with authentication middleware. PII redaction is a critical security feature, removing sensitive data before storage.
-   **UI/UX**: Features a clean, modern interface with a header-based navigation, a customizable document viewer, and a dynamic chat interface with streaming responses, confidence badges, and rating options. The `Inter` font is applied globally.
-   **Analytics**: Provides an analytics dashboard with metrics on user activity, document uploads, chat performance (confidence distribution, rating trends), and most queried documents.

## High-Level Architecture

```mermaid
graph TB
    subgraph Client ["Client (React + Vite)"]
        UI[Landing · Documents · Viewer+Chat · Multi-Doc · Analytics]
        Tech["wouter · TanStack Query · shadcn/ui · KaTeX"]
    end

    Client -->|HTTP / SSE| Server

    subgraph Server ["Server (Express.js)"]
        Auth["Auth (Replit OIDC + Passport)"]
        API["REST API · SSE Streaming · Multer Upload"]

        subgraph Engines
            DocEngine["Doc Engine\nPDF→PNG→Vision\nDOCX→PDF→Vision\nPPTX/XLSX→Parser"]
            ChatEngine["Chat Engine\nProfessor Persona\nGrounding Rules\nConfidence Scoring"]
            RAGEngine["RAG Engine\nChunk (4.5k/600 overlap)\nEmbed (MiniLM-L6-v2)\nHNSW Vector Search"]
        end

        PII["PII Redaction (Regex ∥ AI → Regex re-pass)"]
        Meta["Metadata Extraction"]
    end

    Server --> PG
    Server --> PGV
    Server --> OpenAI

    subgraph Storage ["Data Stores"]
        PG["PostgreSQL\nUsers · Documents · Messages\nSessions · Ratings · Testimonials"]
        PGV["pgvector\n384-dim embeddings\nHNSW index · Cosine similarity"]
        OpenAI["OpenAI API (GPT-5.2)\nVision · Chat\nConfidence · Metadata"]
    end
```

## Data Flow

```mermaid
flowchart LR
    subgraph Upload Flow
        U1[File Upload] --> U2[Convert Format]
        U2 -->|PDF| U2a[pdftoppm → PNG]
        U2 -->|DOCX| U2b[LibreOffice → PDF → PNG]
        U2 -->|PPTX/XLSX| U2c[officeParser → Text]
        U2a & U2b & U2c --> U3[AI Vision / GPT Extraction]
        U3 --> U4["PII Redaction\n(regex ∥ AI → regex re-pass)"]
        U4 --> U5[Metadata Extraction]
        U5 --> U6[Store in PostgreSQL]
        U6 --> U7["Chunk Text\n(4500 chars, 600 overlap)"]
        U7 --> U8["Embed\n(MiniLM-L6-v2, batch 8)"]
        U8 --> U9["Store Vectors\n(pgvector, batch 20)"]
    end

    subgraph Chat Flow
        C1[User Question] --> C2[Embed Query]
        C2 --> C3[HNSW Cosine Search]
        C3 --> C4[Top-K Chunks Retrieved]
        C4 --> C5["Inject Context +\nGrounding Rules"]
        C5 --> C6["GPT-5.2 Stream\n(SSE)"]
        C6 --> C7[Confidence Score]
        C7 --> C8["User Rating\n(thumbs up/down)"]
    end
```

### Authentication & Access Flow

```mermaid
flowchart TD
    V[Visitor] --> LP[Landing Page]
    LP -->|Click Login| OIDC[Replit OIDC]
    OIDC -->|Token| Passport[Passport.js]
    Passport --> SessionStore[(Session in PostgreSQL)]
    Passport --> AllowCheck{Email in Allowlist?}
    AllowCheck -->|Yes| App[Authenticated App]
    AllowCheck -->|No| Restricted[Access Restricted Page]
    App --> AdminCheck{User ID in ADMIN_USER_IDS?}
    AdminCheck -->|Yes| AdminRoutes[Admin API + User Management]
    AdminCheck -->|No| UserRoutes[Standard API Routes]
```

### PII Redaction Pipeline

```mermaid
flowchart TD
    Raw[Raw Extracted Text] --> Fork{Parallel Processing}
    Fork --> Regex[Regex Detection\nSSN · Phone · Email\nCredit Card · DOB\nAddress · Bank Acct\nDriver License]
    Fork --> AI[AI Detection\nNames in context\nFinancial details\nNon-pattern PII]
    Regex --> RegexOut[Regex-Redacted Text]
    AI --> AIOut[AI-Redacted Text]
    AIOut --> RePass[Regex Re-Pass\non AI Output]
    RegexOut --> Merge[Merge Results]
    RePass --> Merge
    Merge --> Redacted["Final Redacted Text\n[SSN REDACTED]\n[PHONE REDACTED]\n[EMAIL REDACTED]\netc."]
    Redacted --> Store[(Store in DB)]
```

### RAG Pipeline Detail

```mermaid
flowchart TD
    subgraph Indexing
        Doc[Redacted Document] --> Split["Math-Aware Chunking\n4500 chars · 600 overlap\nPreserves LaTeX blocks"]
        Split --> Chunks[Document Chunks]
        Chunks --> Embed["Local Embedding\nall-MiniLM-L6-v2\n384 dimensions\nBatch size: 8"]
        Embed --> Vectors["Vector Storage\npgvector · HNSW index\nBatch insert: 20/query"]
    end

    subgraph Retrieval
        Query[User Question] --> QEmbed[Embed Query]
        QEmbed --> Search["HNSW Cosine Search\nTop-K chunks"]
        Search --> Context[Retrieved Chunks]
    end

    subgraph Generation
        Context --> Prompt["System Prompt\nProfessor Persona\n5 Grounding Rules\nAnti-Hallucination"]
        Prompt --> LLM["GPT-5.2\nSSE Streaming"]
        LLM --> Confidence["Confidence Scorer\nPenalizes out-of-doc\n0-100%"]
        Confidence --> Response[Final Response + Badge]
    end

    Vectors -.->|indexed| Search
```

### Document Processing by Type

```mermaid
flowchart LR
    subgraph PDF
        P1[PDF File] --> P2[pdftoppm] --> P3[PNG Pages\n5 per batch] --> P4[GPT-5.2 Vision] --> P5[Structured Markdown]
    end

    subgraph DOCX
        D1[DOCX File] --> D2[LibreOffice] --> D3[PDF] --> D4[pdftoppm] --> D5[PNG Pages] --> D6[GPT-5.2 Vision] --> D7[Structured Markdown]
    end

    subgraph PPTX
        X1[PPTX File] --> X2[officeParser] --> X3[Raw Text] --> X4[GPT Formatting] --> X5[Structured Markdown]
    end

    subgraph XLSX
        E1[XLSX File] --> E2[officeParser] --> E3[Parsed Data] --> E4[GPT Formatting] --> E5[Markdown Tables]
    end
```

## External Dependencies
-   **OpenAI GPT-5.2**: Accessed via Replit AI Integrations for vision, chat, confidence scoring, and metadata extraction.
-   **PostgreSQL**: Primary database for all application data, including user information, document metadata, chat history, and vector embeddings.
-   **pgvector**: PostgreSQL extension for efficient vector similarity search.
-   **@xenova/transformers**: Used for running the `all-MiniLM-L6-v2` embedding model locally.
-   **pdftoppm (poppler-utils)**: For converting PDF pages to PNG images during document processing.
-   **LibreOffice**: Used for converting DOCX files to PDF for vision-based extraction.
-   **officeParser**: For extracting content from PPTX and XLSX files.
-   **Replit Auth**: OpenID Connect-based authentication service.
-   **Google Analytics**: For tracking user interactions and route changes.
-   **KaTeX**: For client-side rendering of mathematical formulas.