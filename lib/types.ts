// ─── Verification Policy ───
// Defined by the ISSUER when they attest a credential.
export interface VerificationPolicy {
    allowPhotocopy: boolean;
    allowDigitalReproduction: boolean;
    requireOriginal: boolean;
    minimumExtractionConfidence: number; // 0.0 to 1.0
    strictnessLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Default policy for when none is specified
export const DEFAULT_POLICY: VerificationPolicy = {
    allowPhotocopy: true,
    allowDigitalReproduction: true,
    requireOriginal: false,
    minimumExtractionConfidence: 0.7,
    strictnessLevel: 'MEDIUM',
};

// ─── AI Extraction Result ───
// What Gemini returns after parsing a document.
export interface AIExtractionResult {
    structuredData: Record<string, any>;
    extractionConfidence: number;
    documentType: 'ORIGINAL' | 'PHOTOCOPY' | 'DIGITAL';
    advisoryNotes: string[];
}

// ─── Final Verification Decision ───
export type FinalDecision = 'Verified' | 'VerifiedWithWarning' | 'PolicyWarning' | 'NotRegistered';

export interface VerificationResult {
    decision: FinalDecision;
    cryptographicMatch: boolean;
    extractionConfidence: number;
    documentType: string;
    policyCompliant: boolean;
    reasons: string[];
}

// ─── Policy Engine ───
// Evaluates crytographic proof + AI advisory against the issuer's policy.
export function evaluatePolicy(
    cryptoMatch: boolean,
    aiResult: AIExtractionResult,
    policy: VerificationPolicy
): VerificationResult {
    const reasons: string[] = [];
    let decision: FinalDecision = 'NotRegistered';

    // Step 1: Cryptographic check is absolute
    if (!cryptoMatch) {
        reasons.push('SHA-256 hash does not match any on-chain record.');
        return {
            decision: 'NotRegistered',
            cryptographicMatch: false,
            extractionConfidence: aiResult.extractionConfidence,
            documentType: aiResult.documentType,
            policyCompliant: false,
            reasons,
        };
    }

    reasons.push('SHA-256 hash matches on-chain record.');

    // Step 2: Check extraction confidence against policy threshold
    const confidencePassed = aiResult.extractionConfidence >= policy.minimumExtractionConfidence;
    if (!confidencePassed) {
        reasons.push(`Extraction confidence ${(aiResult.extractionConfidence * 100).toFixed(0)}% is below policy minimum ${(policy.minimumExtractionConfidence * 100).toFixed(0)}%.`);
    } else {
        reasons.push(`Extraction confidence ${(aiResult.extractionConfidence * 100).toFixed(0)}% meets policy threshold.`);
    }

    // Step 3: Check document type against policy
    let docTypeAllowed = true;
    if (aiResult.documentType === 'PHOTOCOPY' && !policy.allowPhotocopy) {
        docTypeAllowed = false;
        reasons.push('Policy does not allow photocopies.');
    }
    if (aiResult.documentType === 'DIGITAL' && !policy.allowDigitalReproduction) {
        docTypeAllowed = false;
        reasons.push('Policy does not allow digital reproductions.');
    }
    if (policy.requireOriginal && aiResult.documentType !== 'ORIGINAL') {
        docTypeAllowed = false;
        reasons.push('Policy requires original document.');
    }
    if (docTypeAllowed) {
        reasons.push(`Document type "${aiResult.documentType}" is permitted by policy.`);
    }

    // Step 4: Determine final decision
    if (confidencePassed && docTypeAllowed) {
        decision = 'Verified';
    } else if (!docTypeAllowed && confidencePassed) {
        decision = 'PolicyWarning';
    } else if (docTypeAllowed && !confidencePassed) {
        decision = 'VerifiedWithWarning';
    } else {
        decision = 'PolicyWarning';
    }

    // Step 5: Strictness adjustments
    if (policy.strictnessLevel === 'HIGH' && decision !== 'Verified') {
        decision = 'PolicyWarning';
        reasons.push('HIGH strictness: any non-perfect condition is flagged.');
    }
    if (policy.strictnessLevel === 'LOW' && decision === 'VerifiedWithWarning') {
        decision = 'Verified';
        reasons.push('LOW strictness: warnings are treated as acceptable.');
    }

    return {
        decision,
        cryptographicMatch: true,
        extractionConfidence: aiResult.extractionConfidence,
        documentType: aiResult.documentType,
        policyCompliant: decision === 'Verified',
        reasons,
    };
}
