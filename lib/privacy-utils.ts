import CryptoJS from "crypto-js";

/**
 * Creates a deterministic canonical data object from any document's extracted fields.
 * - Sorts keys alphabetically
 * - Trims whitespace
 * - Normalizes strings (collapse multiple spaces, trim)
 * 
 * This is NOT student-specific — works for any credential type.
 */
export function createCanonicalData(data: Record<string, any>): Record<string, any> {
    const canonical: Record<string, any> = {};

    Object.keys(data).sort().forEach(key => {
        let value = data[key];

        if (typeof value === 'string') {
            // Trim, collapse double spaces, normalize
            value = value.trim().replace(/\s+/g, ' ');
        }

        // Skip null/undefined values for determinism
        if (value !== null && value !== undefined && value !== '') {
            canonical[key] = value;
        }
    });

    return canonical;
}

/**
 * Hashes a canonical data object using SHA-256.
 * Returns a hex string prefixed with '0x'.
 */
export function hashDocumentData(data: Record<string, any>): string {
    const canonical = createCanonicalData(data);
    const jsonString = JSON.stringify(canonical);
    const hash = CryptoJS.SHA256(jsonString).toString(CryptoJS.enc.Hex);
    return '0x' + hash;
}

/**
 * Verifies if a given data object matches a target hash.
 */
export function verifyDocumentData(data: Record<string, any>, targetHash: string): boolean {
    const calculated = hashDocumentData(data);
    return calculated.toLowerCase() === targetHash.toLowerCase();
}

/**
 * Calculates the exact SHA-256 hash of a file's raw bytes.
 * This is used for "Strict Mode" (Cryptographic Byte Match).
 * Bypasses AI completely for 100% deterministic mathematical verification.
 */
export async function hashFileBytes(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    // Use native Web Crypto API for fast, browser-native hashing of binary data
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Convert bytes to hex string
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return '0x' + hashHex;
}

// Legacy compatibility exports (used by existing verifier page)
export interface PrivateStudentData {
    recipientName: string;
    recipientId: string;
    documentType: string;
}

export function hashStudentData(data: PrivateStudentData): string {
    return hashDocumentData(data);
}
