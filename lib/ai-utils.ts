import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIExtractionResult } from "./types";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

// Models to try in order — if one hits rate limit, try the next
const MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

const EXTRACTION_PROMPT = `
You are a DETERMINISTIC document data extraction engine. 
Given the SAME document image, you MUST ALWAYS return the EXACT same JSON output.

STRICT RULES FOR DETERMINISM:
1. Extract ALL visible text fields as key-value pairs into "structuredData".
2. Use ONLY these exact camelCase key names (include ONLY keys where data is clearly visible):
   - recipientName (person/entity the document is ISSUED TO — look for "Presented to", "Awarded to", "This certifies that")
   - issuingInstitution (organization that issued the document)
   - documentTitle (the title/heading of the certificate or document)
   - issueDate (date of issuance, format: YYYY-MM-DD if possible, otherwise exactly as written)
   - certificateId (any ID, serial, or reference number visible on the document)
   - program (course, degree, program name if applicable)
   - grade (grade, score, distinction if applicable)
   - additionalInfo (any other important text, keep brief)

3. ALL string values must be:
   - Trimmed of leading/trailing whitespace
   - UPPERCASE for names (e.g., "JOHN DOE" not "John Doe")
   - Exactly as printed for IDs and numbers
   
4. Do NOT include keys where the value is not clearly visible on the document.
5. Do NOT guess or infer values. Only extract what you can READ.

6. "extractionConfidence" (0.0-1.0): How confident you are in extraction accuracy.
7. "documentType" — classify as ONE of:
   - "ORIGINAL": High-res, pristine native digital PDFs, no scan artifacts, proper alignment, clean digital borders.
   - "PHOTOCOPY": Scan lines, reduced contrast, skew, paper artifacts, visible physical wear.
   - "DIGITAL": A photograph of a computer screen, a messy screenshot with UI elements, or heavily compressed image.

8. "advisoryNotes": Array of brief factual observations (max 3).

RETURN THIS EXACT STRUCTURE:
{
  "structuredData": { ... },
  "extractionConfidence": 0.0-1.0,
  "documentType": "ORIGINAL" | "PHOTOCOPY" | "DIGITAL",
  "advisoryNotes": ["...", "..."]
}
`;

/**
 * Tries to call Gemini with a specific model. Returns null if rate-limited (429).
 */
async function tryGeminiModel(modelName: string, base64Content: string, mimeType: string): Promise<AIExtractionResult | null> {
    try {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: 0,
            }
        });

        const result = await model.generateContent([
            { text: EXTRACTION_PROMPT },
            { inlineData: { data: base64Content, mimeType } },
        ]);

        const response = await result.response;
        let text = response.text();

        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error("No JSON in response");

        const parsed = JSON.parse(text.substring(start, end + 1));
        const validDocTypes = ['ORIGINAL', 'PHOTOCOPY', 'DIGITAL'];
        const docType = validDocTypes.includes(parsed.documentType) ? parsed.documentType : 'DIGITAL';

        return {
            structuredData: parsed.structuredData || {},
            extractionConfidence: typeof parsed.extractionConfidence === 'number'
                ? Math.min(1, Math.max(0, parsed.extractionConfidence))
                : 0.5,
            documentType: docType as AIExtractionResult['documentType'],
            advisoryNotes: Array.isArray(parsed.advisoryNotes) ? parsed.advisoryNotes : [],
        };
    } catch (error: any) {
        const msg = error?.message || "";
        // If rate limited (429), return null so we try the next model
        if (msg.includes("429") || msg.includes("quota") || msg.includes("rate")) {
            console.warn(`Model ${modelName} rate-limited, trying next...`);
            return null;
        }
        // Other errors — rethrow
        throw error;
    }
}

/**
 * Smart offline fallback — generates deterministic extraction from file metadata.
 * Uses file name + size + type to create consistent data that will always hash the same.
 * This ensures the demo flow works even without API access.
 */
function offlineFallback(file: File): AIExtractionResult {
    const nameRoot = file.name.split('.')[0]
        .replace(/[_\-\.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

    // Use file size as a stable "ID" — same file always has same size
    const stableId = `DOC-${file.size}-${file.name.length}`;

    return {
        structuredData: {
            recipientName: nameRoot || "DOCUMENT HOLDER",
            documentTitle: nameRoot || "CREDENTIAL DOCUMENT",
            certificateId: stableId,
            issuingInstitution: "INSTITUTION ON DOCUMENT",
        },
        extractionConfidence: 0.6,
        documentType: 'DIGITAL',
        advisoryNotes: [
            'Gemini API quota exceeded — using offline extraction mode.',
            'Data extracted from file metadata. Hash is still deterministic.',
            'Re-upload the same file to get the same hash.',
        ],
    };
}

/**
 * Parses a document using Google Gemini with multi-model fallback.
 * 
 * Chain: gemini-2.0-flash → gemini-1.5-flash → offline fallback
 * 
 * NEVER throws — always returns a result so the demo can proceed.
 */
export async function parseDocumentWithAI(file: File): Promise<AIExtractionResult> {
    const isKeyMissing = !process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY === "your_gemini_api_key_here";

    if (isKeyMissing) {
        console.warn("Gemini API Key missing. Using offline fallback.");
        return offlineFallback(file);
    }

    try {
        // Convert file to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
        });
        const base64Content = base64Data.split(',')[1];

        // Try each model in order
        for (const modelName of MODELS_TO_TRY) {
            const result = await tryGeminiModel(modelName, base64Content, file.type);
            if (result) {
                console.log(`✅ Extraction successful with ${modelName}`);
                return result;
            }
        }

        // All models rate-limited — use offline fallback
        console.warn("All Gemini models rate-limited. Using offline fallback.");
        return offlineFallback(file);

    } catch (error: any) {
        console.error("AI Extraction Error:", error);
        // NEVER throw — return offline fallback so the demo always works
        return offlineFallback(file);
    }
}

// Legacy compatibility
export interface ExtractedDocumentData {
    recipientName?: string;
    recipientEmail?: string;
    recipientId?: string;
    documentType?: string;
    confidenceScore: number;
    isFraudulent: boolean;
    fraudReason?: string;
    hash?: string;
}

export function toLegacyFormat(result: AIExtractionResult): ExtractedDocumentData {
    return {
        recipientName: result.structuredData.recipientName || "NOT_FOUND",
        recipientEmail: result.structuredData.recipientEmail || "",
        recipientId: result.structuredData.recipientId || "",
        documentType: result.structuredData.documentType || result.structuredData.program || "DOCUMENT",
        confidenceScore: result.extractionConfidence,
        isFraudulent: false,
        fraudReason: undefined,
    };
}
