import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface PiiDetectionResult {
  redactedText: string;
  piiFound: boolean;
  typesDetected: string[];
}

const SSN_PATTERN = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g;

const PHONE_PATTERN = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g;

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

const CREDIT_CARD_PATTERN = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

const BANK_ACCOUNT_PATTERN = /\b(?:account\s*(?:#|number|no\.?)?[:.\s]*)\d{6,17}\b/gi;

const DRIVERS_LICENSE_PATTERN = /\b(?:DL|driver'?s?\s*(?:license|lic)\.?\s*(?:#|number|no\.?)?[:.\s]*)[A-Z0-9]{5,15}\b/gi;

const DOB_PATTERN = /\b(?:(?:DOB|date\s*of\s*birth|born|birthday|birth\s*date)\s*[:.\s]*\s*)(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/gi;

const ADDRESS_PATTERN = /\b\d{1,6}\s+(?:[A-Za-z0-9]+\s){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Drive|Dr|Court|Ct|Road|Rd|Lane|Ln|Way|Place|Pl|Circle|Cir|Terrace|Ter|Trail|Trl|Pike|Highway|Hwy)\.?(?:\s*(?:#|Apt\.?|Suite|Ste\.?|Unit|Bldg\.?|Floor|Fl\.?)\s*[A-Za-z0-9\-]+)?\s*,?\s*[A-Za-z\s]+,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gi;

interface PatternConfig {
  pattern: RegExp;
  label: string;
  type: string;
}

const PII_PATTERNS: PatternConfig[] = [
  { pattern: SSN_PATTERN, label: "[SSN REDACTED]", type: "SSN" },
  { pattern: EMAIL_PATTERN, label: "[EMAIL REDACTED]", type: "Email" },
  { pattern: CREDIT_CARD_PATTERN, label: "[CREDIT CARD REDACTED]", type: "Credit Card" },
  { pattern: ADDRESS_PATTERN, label: "[ADDRESS REDACTED]", type: "Address" },
  { pattern: BANK_ACCOUNT_PATTERN, label: "[BANK ACCOUNT REDACTED]", type: "Bank Account" },
  { pattern: DRIVERS_LICENSE_PATTERN, label: "[DRIVERS LICENSE REDACTED]", type: "Drivers License" },
  { pattern: DOB_PATTERN, label: "[DOB REDACTED]", type: "Date of Birth" },
  { pattern: PHONE_PATTERN, label: "[PHONE REDACTED]", type: "Phone" },
];

function redactWithRegex(text: string): { text: string; typesDetected: string[] } {
  let result = text;
  const typesDetected: Set<string> = new Set();

  for (const { pattern, label, type } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    if (regex.test(result)) {
      typesDetected.add(type);
      const freshRegex = new RegExp(pattern.source, pattern.flags);
      result = result.replace(freshRegex, label);
    }
  }

  return { text: result, typesDetected: Array.from(typesDetected) };
}

async function redactWithAI(text: string): Promise<{ text: string; additionalTypes: string[] }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a PII redaction specialist. Your job is to find and redact any remaining personally identifiable information (PII) in the text that simple regex patterns might miss.

Look for:
- Full personal names when used in context of personal data (e.g., "Patient: John Smith", "Tenant: Jane Doe") — replace with [NAME REDACTED]
- Financial details like specific salary amounts, loan amounts tied to individuals — replace with [FINANCIAL DETAIL REDACTED]
- Personal identification numbers not caught by standard patterns — replace with [ID REDACTED]
- Any other PII that could identify a specific individual

Do NOT redact:
- Author names in academic citations or bibliographic references
- Names of organizations, companies, or institutions
- Public figures mentioned in academic/news context
- Generic dates not tied to personal birth dates
- Property addresses when only city/state/zip (no street address)

Return the text with redactions applied. If no additional PII is found, return the text unchanged.
After the redacted text, on a new line, output exactly: PII_TYPES_FOUND: followed by a comma-separated list of PII types found (or "none" if nothing was redacted).`,
        },
        {
          role: "user",
          content: text.slice(0, 30000),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content || text;

    const typesMatch = raw.match(/PII_TYPES_FOUND:\s*(.+)$/m);
    let additionalTypes: string[] = [];
    let redactedText = raw;

    if (typesMatch) {
      redactedText = raw.slice(0, typesMatch.index).trim();
      const typesStr = typesMatch[1].trim();
      if (typesStr.toLowerCase() !== "none") {
        additionalTypes = typesStr.split(",").map(t => t.trim()).filter(Boolean);
      }
    }

    if (text.length > 30000) {
      redactedText = redactedText + text.slice(30000);
    }

    return { text: redactedText, additionalTypes };
  } catch (e) {
    console.error("AI PII redaction error:", e);
    return { text, additionalTypes: [] };
  }
}

export async function detectAndRedactPII(text: string): Promise<PiiDetectionResult> {
  const [regexResult, aiResult] = await Promise.all([
    Promise.resolve(redactWithRegex(text)),
    redactWithAI(text).catch((e) => {
      console.error("AI PII redaction failed, using regex-only results:", e);
      return { text, additionalTypes: [] as string[] };
    }),
  ]);

  const typeSet = new Set<string>();
  regexResult.typesDetected.forEach(t => typeSet.add(t));
  aiResult.additionalTypes.forEach(t => typeSet.add(t));

  let finalText = aiResult.text;
  for (const { pattern, label } of PII_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    finalText = finalText.replace(regex, label);
  }

  const allTypes = Array.from(typeSet);

  return {
    redactedText: finalText,
    piiFound: allTypes.length > 0,
    typesDetected: allTypes,
  };
}

export function sanitizeMetadataField(value: string | null): string | null {
  if (!value) return null;
  const { text } = redactWithRegex(value);
  return text;
}

export function detectAndRedactPIISync(text: string): PiiDetectionResult {
  const regexResult = redactWithRegex(text);

  return {
    redactedText: regexResult.text,
    piiFound: regexResult.typesDetected.length > 0,
    typesDetected: regexResult.typesDetected,
  };
}
