import { pool } from "./db";
import { pipeline, env } from "@xenova/transformers";

env.cacheDir = "./.cache/models";
env.allowLocalModels = false;

const CHUNK_SIZE = 4500;
const CHUNK_OVERLAP = 600;
const DEFAULT_TOP_K = 15;
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

let embedder: any = null;
let vectorReady = false;

export async function initVectorSupport(): Promise<void> {
  if (vectorReady) return;
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'document_chunks' AND column_name = 'embedding'
    `);
    if (colCheck.rows.length === 0) {
      await client.query("ALTER TABLE document_chunks ADD COLUMN embedding vector(384)");
      console.log("Added embedding column to document_chunks");
    }
    const idxCheck = await client.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'document_chunks' AND indexname = 'idx_chunks_embedding'
    `);
    if (idxCheck.rows.length === 0) {
      try {
        await client.query("CREATE INDEX idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops)");
        console.log("Created HNSW index on embedding column");
      } catch (hnswerr: any) {
        console.log("HNSW index not available, falling back to IVFFlat:", hnswerr.message);
        try {
          await client.query("CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)");
          console.log("Created IVFFlat index on embedding column");
        } catch (ivferr: any) {
          console.log("IVFFlat index creation skipped (may need more rows):", ivferr.message);
        }
      }
    }
    vectorReady = true;
    console.log("Vector support initialized");
  } finally {
    client.release();
  }
}

async function getEmbedder() {
  if (!embedder) {
    console.log("Loading embedding model (first time may take a moment)...");
    embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
    console.log("Embedding model loaded.");
  }
  return embedder;
}

function containsOpenMathBlock(text: string): boolean {
  const openBlocks = (text.match(/\$\$/g) || []).length;
  return openBlocks % 2 !== 0;
}

function isMathHeavy(text: string): boolean {
  const mathPatterns = /\$\$[\s\S]*?\$\$|\$[^$]+\$|\\begin\{(equation|align|gather|multline|eqnarray)/g;
  const matches = text.match(mathPatterns) || [];
  return matches.length >= 3 || matches.join("").length > text.length * 0.15;
}

export function chunkDocument(content: string): { content: string; index: number }[] {
  const chunks: { content: string; index: number }[] = [];

  const sections = content.split(/(?=^#{1,3}\s)/m);

  let buffer = "";
  let chunkIndex = 0;
  const effectiveLimit = CHUNK_SIZE;

  for (const section of sections) {
    const combinedLength = buffer.length + section.length;
    const bufferHasOpenMath = containsOpenMathBlock(buffer);
    const sectionHasMath = isMathHeavy(section);
    const expandedLimit = (bufferHasOpenMath || sectionHasMath) ? effectiveLimit * 1.5 : effectiveLimit;

    if (combinedLength > expandedLimit && buffer.length > 0 && !bufferHasOpenMath) {
      chunks.push({ content: buffer.trim(), index: chunkIndex++ });

      const overlapStart = Math.max(0, buffer.length - CHUNK_OVERLAP);
      const overlapText = buffer.slice(overlapStart);
      buffer = overlapText + section;
    } else {
      buffer += section;
    }
  }

  if (buffer.trim().length > 0) {
    chunks.push({ content: buffer.trim(), index: chunkIndex++ });
  }

  if (chunks.length === 0 && content.trim().length > 0) {
    const paragraphs = content.split(/\n\n+/);
    buffer = "";
    chunkIndex = 0;

    for (const para of paragraphs) {
      const combinedLength = buffer.length + para.length;
      const bufferHasOpenMath = containsOpenMathBlock(buffer);
      const paraHasMath = isMathHeavy(para);
      const expandedLimit = (bufferHasOpenMath || paraHasMath) ? effectiveLimit * 1.5 : effectiveLimit;

      if (combinedLength > expandedLimit && buffer.length > 0 && !bufferHasOpenMath) {
        chunks.push({ content: buffer.trim(), index: chunkIndex++ });
        const overlapStart = Math.max(0, buffer.length - CHUNK_OVERLAP);
        buffer = buffer.slice(overlapStart) + "\n\n" + para;
      } else {
        buffer += (buffer ? "\n\n" : "") + para;
      }
    }

    if (buffer.trim().length > 0) {
      chunks.push({ content: buffer.trim(), index: chunkIndex++ });
    }
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const embed = await getEmbedder();
  const truncated = text.slice(0, 2000);
  const output = await embed(truncated, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embed = await getEmbedder();
  const truncated = texts.map(t => t.slice(0, 2000));
  const results: number[][] = [];
  const BATCH_SIZE = 8;
  for (let i = 0; i < truncated.length; i += BATCH_SIZE) {
    const batch = truncated.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (text) => {
        const output = await embed(text, { pooling: "mean", normalize: true });
        return Array.from(output.data as Float32Array);
      })
    );
    results.push(...batchResults);
  }
  return results;
}

export async function indexDocumentChunks(documentId: number, content: string): Promise<number> {
  const chunks = chunkDocument(content);
  if (chunks.length === 0) return 0;

  const texts = chunks.map(c => c.content);
  const embeddings = await generateEmbeddingsBatch(texts);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);

    const INSERT_BATCH = 20;
    for (let b = 0; b < chunks.length; b += INSERT_BATCH) {
      const batchEnd = Math.min(b + INSERT_BATCH, chunks.length);
      const values: string[] = [];
      const params: any[] = [];
      let paramIdx = 1;

      for (let i = b; i < batchEnd; i++) {
        const embeddingStr = `[${embeddings[i].join(",")}]`;
        values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}::vector)`);
        params.push(documentId, chunks[i].content, chunks[i].index, Math.ceil(chunks[i].content.length / 4), embeddingStr);
        paramIdx += 5;
      }

      await client.query(
        `INSERT INTO document_chunks (document_id, content, chunk_index, token_count, embedding)
         VALUES ${values.join(", ")}`,
        params
      );
    }

    await client.query("COMMIT");
    return chunks.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function findRelevantChunks(
  query: string,
  documentIds: number[],
  topK: number = DEFAULT_TOP_K
): Promise<{ content: string; documentId: number; chunkIndex: number; similarity: number }[]> {
  const queryEmbedding = await generateEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const placeholders = documentIds.map((_, i) => `$${i + 3}`).join(",");
  const result = await pool.query(
    `SELECT document_id, content, chunk_index,
            1 - (embedding <=> $1::vector) as similarity
     FROM document_chunks
     WHERE document_id IN (${placeholders})
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [embeddingStr, topK, ...documentIds]
  );

  return result.rows.map(row => ({
    content: row.content,
    documentId: row.document_id,
    chunkIndex: row.chunk_index,
    similarity: parseFloat(row.similarity),
  }));
}

export async function getChunkCount(documentId: number): Promise<number> {
  const result = await pool.query(
    "SELECT COUNT(*) as count FROM document_chunks WHERE document_id = $1",
    [documentId]
  );
  return parseInt(result.rows[0]?.count || "0", 10);
}

export async function deleteDocumentChunks(documentId: number): Promise<void> {
  await pool.query("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);
}
