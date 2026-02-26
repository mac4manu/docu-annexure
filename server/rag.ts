import { pool } from "./db";

const CHUNK_SIZE = 4500;
const CHUNK_OVERLAP = 600;
const DEFAULT_TOP_K = 15;

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

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "both",
  "each", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "don", "now", "and", "but", "or", "if", "while", "that", "this",
  "these", "those", "it", "its", "he", "she", "they", "we", "you",
  "i", "me", "my", "his", "her", "our", "your", "what", "which", "who",
  "whom", "about", "up", "also", "well", "back", "even", "still", "new",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

function computeTfIdf(
  queryTokens: string[],
  chunks: { content: string; documentId: number; chunkIndex: number }[]
): { content: string; documentId: number; chunkIndex: number; similarity: number }[] {
  const chunkTokenSets = chunks.map(c => {
    const tokens = tokenize(c.content);
    const freq = new Map<string, number>();
    for (const t of tokens) {
      freq.set(t, (freq.get(t) || 0) + 1);
    }
    return { tokens, freq, totalTokens: tokens.length };
  });

  const df = new Map<string, number>();
  for (const term of queryTokens) {
    let count = 0;
    for (const cs of chunkTokenSets) {
      if (cs.freq.has(term)) count++;
    }
    df.set(term, count);
  }

  const N = chunks.length;

  return chunks.map((chunk, i) => {
    const cs = chunkTokenSets[i];
    let score = 0;

    for (const term of queryTokens) {
      const tf = (cs.freq.get(term) || 0) / Math.max(cs.totalTokens, 1);
      const docFreq = df.get(term) || 0;
      const idf = docFreq > 0 ? Math.log(1 + N / docFreq) : 0;
      score += tf * idf;
    }

    const headingBonus = chunk.content.match(/^#{1,3}\s/m) ? 0.1 : 0;
    const queryBigrams = getBigrams(queryTokens);
    const chunkText = chunk.content.toLowerCase();
    let bigramBonus = 0;
    for (const bigram of queryBigrams) {
      if (chunkText.includes(bigram)) bigramBonus += 0.15;
    }

    return {
      content: chunk.content,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      similarity: score + headingBonus + bigramBonus,
    };
  });
}

function getBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return bigrams;
}

export async function indexDocumentChunks(documentId: number, content: string): Promise<number> {
  const chunks = chunkDocument(content);
  if (chunks.length === 0) return 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM document_chunks WHERE document_id = $1", [documentId]);

    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        `INSERT INTO document_chunks (document_id, content, chunk_index, token_count)
         VALUES ($1, $2, $3, $4)`,
        [documentId, chunks[i].content, chunks[i].index, Math.ceil(chunks[i].content.length / 4)]
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
  const placeholders = documentIds.map((_, i) => `$${i + 1}`).join(",");
  const result = await pool.query(
    `SELECT document_id, content, chunk_index
     FROM document_chunks
     WHERE document_id IN (${placeholders})
     ORDER BY chunk_index ASC`,
    [...documentIds]
  );

  if (result.rows.length === 0) return [];

  const chunks = result.rows.map(row => ({
    content: row.content as string,
    documentId: row.document_id as number,
    chunkIndex: row.chunk_index as number,
  }));

  const queryTokens = tokenize(query);
  const scored = computeTfIdf(queryTokens, chunks);

  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .filter(c => c.similarity > 0);
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
