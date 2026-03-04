"use client"
import Link from "next/link";
import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
    Shield, Upload, Brain, Cpu, CheckCircle, AlertCircle, Loader2, Hash, ShieldCheck, Info
} from "lucide-react";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount } from 'wagmi'
import { parseDocumentWithAI } from "@/lib/ai-utils";
import { createCanonicalData, hashDocumentData, hashFileBytes } from "@/lib/privacy-utils";
import { verifyOnChain } from "@/lib/blockchain";
import { evaluatePolicy, DEFAULT_POLICY, VerificationPolicy, VerificationResult, AIExtractionResult, FinalDecision } from "@/lib/types";
import { verifyMerkleProof } from "@/lib/merkle-utils";
import Navbar from "@/components/navbar";

type VerifierStep = 'idle' | 'analyzing' | 'report';

const DECISION_STYLES: Record<FinalDecision, { bg: string; border: string; text: string; icon: typeof CheckCircle }> = {
    'Verified': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: CheckCircle },
    'VerifiedWithWarning': { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertCircle },
    'PolicyWarning': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: Info },
    'NotRegistered': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: AlertCircle },
};

export default function VerifierPage() {
    const { open } = useWeb3Modal();
    const { address } = useAccount();

    const [step, setStep] = useState<VerifierStep>('idle');
    const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);
    const [network, setNetwork] = useState<"PUBLIC" | "LOCAL">("PUBLIC");

    // 3-step engine results
    const [aiResult, setAiResult] = useState<AIExtractionResult | null>(null);
    const [strictHash, setStrictHash] = useState<string | null>(null);
    const [easyHash, setEasyHash] = useState<string | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    type MatchType = 'strict_direct' | 'easy_direct' | 'strict_merkle' | 'easy_merkle' | 'none';
    const [matchType, setMatchType] = useState<MatchType>('none');
    const [matchedHash, setMatchedHash] = useState<string | null>(null);
    const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
    const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
    const [policy, setPolicy] = useState<VerificationPolicy>(DEFAULT_POLICY);

    const handleProofFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setProofFile(e.target.files[0]);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedFile(file);
        setFileType(file.type);
        setStep('idle');

        // Reset old results
        setAiResult(null);
        setStrictHash(null);
        setEasyHash(null);
        setMatchType('none');
        setMatchedHash(null);
        setMerkleRoot(null);
        setVerificationResult(null);

        const reader = new FileReader();
        reader.onload = (e) => setUploadedPreview(e.target?.result as string);
        reader.readAsDataURL(file);
    };

    const runVerification = async () => {
        if (!selectedFile) return;
        setStep('analyzing');

        try {
            // Read optional proof file if provided
            let proofData: { merkleRoot: string, proofs?: any[], merkleProofs?: any[] } | null = null;
            if (proofFile) {
                const proofText = await proofFile.text();
                try { proofData = JSON.parse(proofText); } catch { console.warn("Invalid proof file JSON"); }
            } else {
                // Fallback to session storage if they just issued it in the same browser (for demo flow)
                const sessionData = sessionStorage.getItem('tap_merkle_data');
                if (sessionData) {
                    try { proofData = JSON.parse(sessionData); } catch { }
                }
            }

            // ═══ STRICT MODE HASH (File Bytes) ═══
            const calculatedStrictHash = await hashFileBytes(selectedFile);
            setStrictHash(calculatedStrictHash);

            // ═══ EASY MODE HASH (AI JSON) ═══
            const extraction = await parseDocumentWithAI(selectedFile);
            setAiResult(extraction);
            const canonical = createCanonicalData(extraction.structuredData);
            const calculatedEasyHash = hashDocumentData(canonical);
            setEasyHash(calculatedEasyHash);

            // ═══ CRYPTOGRAPHIC CHECK ═══
            let currentMatch: MatchType = 'none';
            let finalHash: string | null = null;
            let finalMerkleRoot: string | null = null;

            const actualProofs = proofData ? (proofData.merkleProofs || proofData.proofs) : null;

            // 1. Try Strict Direct
            if (await verifyOnChain(calculatedStrictHash)) {
                currentMatch = 'strict_direct';
                finalHash = calculatedStrictHash;
            }
            // 2. Try Easy Direct
            else if (await verifyOnChain(calculatedEasyHash)) {
                currentMatch = 'easy_direct';
                finalHash = calculatedEasyHash;
            }
            // 3. Try Merkle (Strict then Easy)
            else if (proofData && actualProofs) {
                const { merkleRoot } = proofData;
                const strictMatch = actualProofs.find((p: any) => p.leafHash === calculatedStrictHash);
                const easyMatch = actualProofs.find((p: any) => p.leafHash === calculatedEasyHash);

                if (strictMatch && verifyMerkleProof(strictMatch.proof, calculatedStrictHash, merkleRoot) && await verifyOnChain(merkleRoot)) {
                    currentMatch = 'strict_merkle';
                    finalHash = calculatedStrictHash;
                    finalMerkleRoot = merkleRoot;
                } else if (easyMatch && verifyMerkleProof(easyMatch.proof, calculatedEasyHash, merkleRoot) && await verifyOnChain(merkleRoot)) {
                    currentMatch = 'easy_merkle';
                    finalHash = calculatedEasyHash;
                    finalMerkleRoot = merkleRoot;
                }
            }

            setMatchType(currentMatch);
            setMatchedHash(finalHash);
            setMerkleRoot(finalMerkleRoot);

            // ═══ STEP 3: Policy Engine ═══
            let activePolicy = DEFAULT_POLICY;
            try {
                if (proofData && (proofData as any).policy) {
                    activePolicy = (proofData as any).policy;
                } else {
                    const stored = sessionStorage.getItem('tap_verify_data');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (parsed.policy) activePolicy = parsed.policy;
                    }
                }
            } catch { /* use default */ }
            setPolicy(activePolicy);

            const isVerifiedOnChain = currentMatch !== 'none';
            const result = evaluatePolicy(isVerifiedOnChain, extraction, activePolicy);
            setVerificationResult(result);

            setStep('report');
        } catch (error) {
            console.error(error);
            setStep('idle');
        }
    };

    const reset = () => {
        setStep('idle');
        setUploadedPreview(null);
        setAiResult(null);
        setStrictHash(null);
        setEasyHash(null);
        setMatchType('none');
        setMatchedHash(null);
        setMerkleRoot(null);
        setVerificationResult(null);
    };

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-[35%] h-[35%] blur-[100px] rounded-full" style={{ background: 'var(--glow-2)' }} />
                <div className="absolute bottom-[20%] right-[10%] w-[35%] h-[35%] blur-[100px] rounded-full" style={{ background: 'var(--glow-1)' }} />
            </div>

            <Navbar />

            <main className="flex-1 relative z-10 container py-12 max-w-5xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">Public Verification</h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light">
                        Upload any credential for <span className="text-cyan-400 font-medium">3-Layer Verification</span>: Cryptographic → AI Advisory → Policy Engine.
                    </p>
                </div>

                {step === 'idle' || step === 'analyzing' ? (
                    <div className={`p-10 rounded-[3rem] border transition-all duration-700 min-h-[400px] flex flex-col items-center justify-center ${step === 'analyzing' ? 'bg-cyan-500/5 border-cyan-500/30' : 'glassmorphism border-white/10'}`}>
                        {step === 'analyzing' ? (
                            <div className="text-center space-y-8 w-full max-w-md">
                                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black/40">
                                    <div className="absolute inset-x-0 top-0 h-1 bg-cyan-400 shadow-[0_0_20px_cyan] animate-scan z-10" />
                                    <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                                        <Brain className="h-10 w-10 text-cyan-400 animate-pulse" />
                                        <span className="text-xs font-sans font-bold tracking-[0.3em] text-cyan-400 uppercase">Running_3_Layer_Engine...</span>
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-cyan-500 animate-[progress_2s_ease-in-out_infinite]" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="h-28 w-28 bg-white/5 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/10">
                                    <Upload className="h-12 w-12 text-slate-400" />
                                </div>
                                <div className="w-full max-w-md space-y-4">
                                    <label className="block w-full">
                                        <Button asChild className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg cursor-pointer hover:bg-white/10">
                                            <span>{selectedFile ? `📄 ${selectedFile.name}` : 'Select Credential to Verify'}</span>
                                        </Button>
                                        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                                    </label>
                                    <label className="block w-full">
                                        <Button asChild className={`w-full h-12 rounded-xl border font-bold text-xs tracking-widest uppercase cursor-pointer transition-colors ${proofFile ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-[#020617]/50 border-white/5 text-slate-500 hover:text-slate-300'}`}>
                                            <span>{proofFile ? `📄 Proof: ${proofFile.name}` : 'Attach Merkle Proof .json (Optional)'}</span>
                                        </Button>
                                        <input type="file" accept=".json" onChange={handleProofFileChange} className="hidden" />
                                    </label>
                                    <Button onClick={runVerification} disabled={!selectedFile} className="w-full h-16 rounded-[1.5rem] bg-cyber-gradient text-white font-bold text-xl shadow-2xl shadow-purple-500/30 hover:scale-[1.03] transition-all disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 disabled:cursor-not-allowed mt-4">
                                        Verify Documentation
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                        {/* ═══ FINAL DECISION BANNER ═══ */}
                        {verificationResult && (() => {
                            const style = DECISION_STYLES[verificationResult.decision];
                            const Icon = style.icon;
                            return (
                                <div className={`p-8 rounded-[2.5rem] border-2 ${style.bg} ${style.border} text-center space-y-4`}>
                                    <Icon className={`h-14 w-14 mx-auto ${style.text}`} />
                                    <h2 className={`text-3xl font-black uppercase tracking-widest ${style.text}`}>
                                        {verificationResult.decision.replace(/([A-Z])/g, ' $1').trim()}
                                    </h2>
                                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                                        <div className="px-4 py-2 rounded-full bg-black/30 border border-white/10 text-xs font-bold">
                                            🔐 Blockchain: <span className={matchType !== 'none' ? 'text-green-400' : 'text-red-400'}>
                                                {matchType.includes('merkle') ? 'MERKLE MATCH' : matchType.includes('direct') ? 'DIRECT MATCH' : 'NOT FOUND'}
                                            </span>
                                        </div>
                                        <div className="px-4 py-2 rounded-full bg-black/30 border border-white/10 text-xs font-bold">
                                            🧠 Confidence: <span className="text-cyan-400">{(verificationResult.extractionConfidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="px-4 py-2 rounded-full bg-black/30 border border-white/10 text-xs font-bold">
                                            📄 Type: <span className="text-amber-400">{verificationResult.documentType}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* ═══ STEP 1: Blockchain Verification ═══ */}
                            <div className={`p-6 rounded-[2rem] border ${matchType !== 'none' ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70 text-cyan-400">Step 1: Cryptographic Match</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        {matchType !== 'none' ? <CheckCircle className="h-6 w-6 text-green-400" /> : <AlertCircle className="h-6 w-6 text-red-400" />}
                                        <span className={`font-bold text-sm ${matchType !== 'none' ? 'text-green-400' : 'text-red-400'}`}>
                                            {matchType === 'strict_direct' ? 'Verified (Strict File Match)' :
                                                matchType === 'easy_direct' ? 'Verified (AI Data Match)' :
                                                    matchType === 'strict_merkle' ? 'Verified via Strict Merkle Proof' :
                                                        matchType === 'easy_merkle' ? 'Verified via Fuzzy Merkle Proof' :
                                                            'Hash Not Found On-Chain'}
                                        </span>
                                    </div>

                                    {strictHash && (
                                        <div className={`p-2 rounded-xl border transition-all ${matchType.includes('strict') ? 'bg-green-500/10 border-green-500/30' : 'bg-black/30 border-white/5'}`}>
                                            <span className={`text-[8px] font-bold uppercase tracking-widest block mb-1 ${matchType.includes('strict') ? 'text-green-400' : 'text-slate-500'}`}>
                                                Strict File Hash {matchType.includes('strict') ? '(MATCHED)' : ''}
                                            </span>
                                            <p className={`text-[8px] font-mono break-all ${matchType.includes('strict') ? 'text-green-300' : 'text-slate-600'}`}>
                                                {strictHash}
                                            </p>
                                        </div>
                                    )}

                                    {easyHash && (
                                        <div className={`p-2 rounded-xl border transition-all ${matchType.includes('easy') ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-black/30 border-white/5'}`}>
                                            <span className={`text-[8px] font-bold uppercase tracking-widest block mb-1 ${matchType.includes('easy') ? 'text-cyan-400' : 'text-slate-500'}`}>
                                                Easy Content Hash {matchType.includes('easy') ? '(MATCHED)' : ''}
                                            </span>
                                            <p className={`text-[8px] font-mono break-all ${matchType.includes('easy') ? 'text-cyan-300' : 'text-slate-600'}`}>
                                                {easyHash}
                                            </p>
                                        </div>
                                    )}

                                    {merkleRoot && (
                                        <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 mt-4">
                                            <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest block mb-1">Merkle Root (On-Chain)</span>
                                            <p className="text-[8px] font-mono text-purple-300 break-all">{merkleRoot}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ═══ STEP 2: AI Advisory ═══ */}
                            <div className="p-6 rounded-[2rem] border bg-cyan-500/5 border-cyan-500/20">
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70 text-purple-400">Step 2: AI Advisory</h4>
                                {aiResult && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-400">Confidence</span>
                                            <span className="text-lg font-bold text-cyan-400">{(aiResult.extractionConfidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full" style={{ width: `${aiResult.extractionConfidence * 100}%` }} />
                                        </div>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold ${aiResult.documentType === 'ORIGINAL' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            aiResult.documentType === 'PHOTOCOPY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                            }`}>
                                            {aiResult.documentType}
                                        </div>
                                        {aiResult.advisoryNotes.length > 0 && (
                                            <div className="space-y-1 mt-2">
                                                {aiResult.advisoryNotes.slice(0, 3).map((note, i) => (
                                                    <p key={i} className="text-[9px] text-slate-500">💡 {note}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* ═══ STEP 3: Policy Engine ═══ */}
                            <div className="p-6 rounded-[2rem] border bg-amber-500/5 border-amber-500/20">
                                <h4 className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70 text-amber-400">Step 3: Policy Compliance</h4>
                                {verificationResult && (
                                    <div className="space-y-3">
                                        {verificationResult.reasons.map((reason, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <span className="text-[10px] mt-0.5">
                                                    {reason.includes('matches') || reason.includes('meets') || reason.includes('permitted') || reason.includes('acceptable')
                                                        ? '✅' : reason.includes('below') || reason.includes('not allow') || reason.includes('requires')
                                                            ? '⚠️' : '📋'}
                                                </span>
                                                <p className="text-[10px] text-slate-400 leading-relaxed">{reason}</p>
                                            </div>
                                        ))}
                                        <div className="pt-3 border-t border-white/5">
                                            <span className="text-[9px] text-slate-600 uppercase tracking-widest">Active Policy</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <span className="text-[8px] px-2 py-0.5 rounded bg-white/5 text-slate-500">
                                                    Photocopy: {policy.allowPhotocopy ? '✅' : '❌'}
                                                </span>
                                                <span className="text-[8px] px-2 py-0.5 rounded bg-white/5 text-slate-500">
                                                    Min Conf: {(policy.minimumExtractionConfidence * 100)}%
                                                </span>
                                                <span className="text-[8px] px-2 py-0.5 rounded bg-white/5 text-slate-500">
                                                    Strictness: {policy.strictnessLevel}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Extracted Data */}
                        {aiResult && (
                            <div className="glassmorphism p-8 rounded-[2.5rem] border-white/5">
                                <div className="flex items-center gap-4 mb-6">
                                    <ShieldCheck className="h-6 w-6 text-cyan-400" />
                                    <h3 className="text-lg font-black tracking-widest uppercase">Extracted Data</h3>
                                </div>
                                <div className="grid md:grid-cols-3 gap-6">
                                    {Object.entries(aiResult.structuredData).map(([key, value]) => (
                                        <div key={key} className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">{key}</span>
                                            <span className="text-sm text-white font-medium">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="text-center">
                            <Button onClick={reset} variant="ghost" className="text-slate-500 uppercase text-[10px] font-black tracking-widest">
                                Reset &amp; Verify Another
                            </Button>
                        </div>
                    </div>
                )
                }
            </main >

            <footer className="py-12 border-t border-white/5 opacity-40">
                <div className="container flex justify-between items-center whitespace-nowrap overflow-hidden">
                    <span className="text-xs font-bold uppercase tracking-widest">Trustless Attestation Protocol v3.0</span>
                    <span className="text-xs font-mono text-slate-500">Polygon Amoy • SHA-256 • Policy Engine</span>
                </div>
            </footer>
        </div >
    );
}
