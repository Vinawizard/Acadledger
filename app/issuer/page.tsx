"use client"
import Link from "next/link";
import { useState, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Upload, Brain, Cpu, CheckCircle, AlertCircle, Loader2, ExternalLink, Hash, Sparkles, Settings, Layers } from "lucide-react";
import axios from "axios";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount } from 'wagmi'
import { createCanonicalData, hashDocumentData, hashFileBytes } from "@/lib/privacy-utils";
import { attestOnChain } from "@/lib/blockchain";
import { parseDocumentWithAI, toLegacyFormat } from "@/lib/ai-utils";
import { VerificationPolicy, DEFAULT_POLICY, AIExtractionResult } from "@/lib/types";
import { createMerkleTree, getMerkleRoot, generateMerkleProof } from "@/lib/merkle-utils";
import Navbar from "@/components/navbar";
import { useEffect } from "react";

type WorkflowStep = 'idle' | 'uploading' | 'extracting' | 'extracted' | 'hashing' | 'attesting' | 'complete' | 'error';
type IssuanceMode = 'single' | 'bulk';
type AnchorMode = 'strict' | 'easy';

export default function IssuerPage() {
    const { open } = useWeb3Modal();
    const { address } = useAccount();

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] blur-[100px] rounded-full" style={{ background: 'var(--glow-1)' }} />
                <div className="absolute bottom-[20%] left-[10%] w-[30%] h-[30%] blur-[100px] rounded-full" style={{ background: 'var(--glow-2)' }} />
            </div>

            <Navbar />


            <main className="flex-1 relative z-10 container py-12 max-w-6xl">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40">
                        Institutional Attestation
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light leading-relaxed">
                        Securely anchor credentials to the blockchain.
                        AI extracts structured data while the protocol generates SHA-256 cryptographic proofs.
                    </p>
                </div>

                {!address ? (
                    <div className="max-w-md mx-auto p-12 glassmorphism rounded-[3rem] border-white/10 text-center animate-in zoom-in duration-700 shadow-2xl shadow-purple-500/5">
                        <div className="h-24 w-24 bg-purple-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-purple-500/20 group hover:scale-110 transition-transform">
                            <Shield className="h-12 w-12 text-purple-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Authority Required</h3>
                        <p className="text-slate-400 mb-10 leading-relaxed">Connect an authorized institutional wallet to sign and commit credential data to the ledger.</p>
                        <Button onClick={() => open()} className="w-full h-14 bg-cyber-gradient hover:opacity-90 rounded-2xl font-extrabold text-lg shadow-lg shadow-purple-500/20">
                            Connect Authority
                        </Button>
                    </div>
                ) : (
                    <DemoWorkflow address={address} />
                )}
            </main>
        </div>
    );
}

// ─── Policy Controls Component ───
type PolicyPreset = 'EASY' | 'STRICT';

const POLICY_PRESETS: Record<PolicyPreset, { policy: VerificationPolicy; label: string; desc: string; color: string }> = {
    EASY: {
        label: "Easy",
        desc: "Photocopies & digital reproductions accepted. Low confidence threshold. Good for general credentials like training certs, event badges.",
        color: "green",
        policy: {
            allowPhotocopy: true,
            allowDigitalReproduction: true,
            requireOriginal: false,
            minimumExtractionConfidence: 0.5,
            strictnessLevel: 'LOW',
        }
    },
    STRICT: {
        label: "Strict",
        desc: "Only the original issued document is accepted. High confidence required. Use for sensitive credentials like degrees, legal docs, financial records.",
        color: "red",
        policy: {
            allowPhotocopy: false,
            allowDigitalReproduction: false,
            requireOriginal: true,
            minimumExtractionConfidence: 0.85,
            strictnessLevel: 'HIGH',
        }
    }
};

function PolicyControls({ policy, setPolicy }: { policy: VerificationPolicy; setPolicy: (p: VerificationPolicy) => void }) {
    const activePreset: PolicyPreset = policy.requireOriginal ? 'STRICT' : 'EASY';

    return (
        <div className="glassmorphism p-6 rounded-[2rem] border border-white/10 space-y-5">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                    <Settings className="h-4 w-4 text-amber-400" />
                </div>
                <h4 className="text-sm font-black uppercase tracking-widest text-white/90">Verification Policy</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {(Object.entries(POLICY_PRESETS) as [PolicyPreset, typeof POLICY_PRESETS[PolicyPreset]][]).map(([key, preset]) => (
                    <button
                        key={key}
                        onClick={() => setPolicy(preset.policy)}
                        className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 ${activePreset === key
                            ? key === 'EASY'
                                ? 'bg-green-500/10 border-green-500/40 shadow-lg shadow-green-500/10'
                                : 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/10'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`h-3 w-3 rounded-full ${activePreset === key ? (key === 'EASY' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]') : 'bg-white/20'}`} />
                            <span className={`text-sm font-black uppercase tracking-widest ${activePreset === key ? 'text-white' : 'text-slate-500'}`}>
                                {preset.label}
                            </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${activePreset === key ? 'text-slate-300' : 'text-slate-600'}`}>
                            {preset.desc}
                        </p>
                        {activePreset === key && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-bold">
                                    {policy.allowPhotocopy ? '📋 Copies OK' : '📋 No Copies'}
                                </span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-bold">
                                    {policy.requireOriginal ? '🔒 Original Only' : '🔓 Flexible'}
                                </span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-bold">
                                    Min {(policy.minimumExtractionConfidence * 100).toFixed(0)}%
                                </span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ─── Main Workflow ───
function DemoWorkflow({ address }: { address: string }) {
    const [step, setStep] = useState<WorkflowStep>('idle');
    const [mode, setMode] = useState<IssuanceMode>('single');
    const [anchorMode, setAnchorMode] = useState<AnchorMode>('strict');
    const [policy, setPolicy] = useState<VerificationPolicy>(DEFAULT_POLICY);
    const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<AIExtractionResult | null>(null);
    const [documentHash, setDocumentHash] = useState<string | null>(null);
    const [computedFileHash, setComputedFileHash] = useState<string | null>(null);
    const [computedDataHash, setComputedDataHash] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [showJson, setShowJson] = useState(false);
    const [jsonContent, setJsonContent] = useState<string | null>(null);

    // Bulk mode state
    const [bulkFiles, setBulkFiles] = useState<File[]>([]);
    const [bulkHashes, setBulkHashes] = useState<string[]>([]);
    const [merkleRoot, setMerkleRoot] = useState<string | null>(null);

    // Sync active document hash when anchor mode changes
    useEffect(() => {
        if (mode === 'single' && computedFileHash && computedDataHash) {
            setDocumentHash(anchorMode === 'strict' ? computedFileHash : computedDataHash);
        }
    }, [anchorMode, computedFileHash, computedDataHash, mode]);

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStep('uploading');
        setError(null);
        setAiResult(null);
        setDocumentHash(null);
        setComputedFileHash(null);
        setComputedDataHash(null);
        setTxHash(null);
        setFileName(file.name);
        setFileType(file.type);

        const reader = new FileReader();
        reader.onload = (e) => setUploadedPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setStep('extracting');
        try {
            // Read file bytes out of band for Strict crypto hash
            const fileHash = await hashFileBytes(file);
            setComputedFileHash(fileHash);

            const result = await parseDocumentWithAI(file);
            setAiResult(result);

            // Create canonical data and hash using SHA-256 for Easy AI hash
            const canonical = createCanonicalData(result.structuredData);
            const dataHash = hashDocumentData(canonical);
            setComputedDataHash(dataHash);

            // Set the main document hash to whatever mode is currently active
            const activeHash = anchorMode === 'strict' ? fileHash : dataHash;
            setDocumentHash(activeHash);

            // Store policy alongside the extraction for the verifier to reference
            const exportData = {
                protocol: "TAP_V3",
                institution: "Verified Institution",
                documentInfo: { name: file.name, type: file.type, size: file.size, hash: activeHash, anchorMode },
                extraction: result,
                policy,
                attestation: { status: "PENDING_ANCHOR", timestamp: new Date().toISOString() }
            };
            const jsonStr = JSON.stringify(exportData, null, 2);
            setJsonContent(jsonStr);
            sessionStorage.setItem('tap_verify_data', jsonStr);

            setStep('extracted');
        } catch (err: any) {
            console.error("Extraction failed:", err);
            setError(err.message || "Protocol extraction failed.");
            setStep('error');
        }
    };

    const handleBulkUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setStep('extracting');
        setError(null);
        const fileArray = Array.from(files);
        setBulkFiles(fileArray);

        try {
            const hashes: string[] = [];
            for (const file of fileArray) {
                if (anchorMode === 'strict') {
                    hashes.push(await hashFileBytes(file));
                } else {
                    const result = await parseDocumentWithAI(file);
                    const canonical = createCanonicalData(result.structuredData);
                    hashes.push(hashDocumentData(canonical));
                }
            }
            setBulkHashes(hashes);

            // Generate Merkle Root + proofs for each leaf
            const tree = createMerkleTree(hashes);
            const root = getMerkleRoot(tree);
            setMerkleRoot(root);
            setDocumentHash(root);

            // Generate a Merkle proof for each leaf so individual docs can be verified
            const proofs = hashes.map(h => ({
                leafHash: h,
                proof: generateMerkleProof(tree, h)
            }));

            const exportData = {
                protocol: "TAP_V3_Batch",
                institution: "Verified Institution",
                anchorMode,
                merkleRoot: root,
                leafHashes: hashes,
                merkleProofs: proofs,
                fileCount: fileArray.length,
                policy,
                attestation: { status: "PENDING_ANCHOR", timestamp: new Date().toISOString() }
            };
            setJsonContent(JSON.stringify(exportData, null, 2));

            // Save Merkle data to sessionStorage so the verifier can use it
            sessionStorage.setItem('tap_merkle_data', JSON.stringify({
                merkleRoot: root,
                proofs
            }));

            setStep('extracted');
        } catch (err: any) {
            setError(err.message || "Bulk extraction failed.");
            setStep('error');
        }
    };

    const handleAttest = async () => {
        if (!documentHash) return;
        setStep('hashing');
        setError(null);

        try {
            // Register metadata on IPFS (optional)
            try {
                const legacy = aiResult ? toLegacyFormat(aiResult) : null;
                await axios.post("/api/register", {
                    recipientName: legacy?.recipientName || "Batch",
                    recipientEmail: legacy?.recipientEmail || "",
                    recipientId: legacy?.recipientId || "",
                    recipientWallet: address,
                    documentType: legacy?.documentType || "BATCH",
                    documentDescription: mode === 'bulk' ? `Merkle Root: ${bulkHashes.length} documents` : "Issued via Trustless Attestation Protocol",
                    documentHash: documentHash,
                    embedding: [],
                    documentId: crypto.randomUUID()
                });
            } catch {
                console.warn("IPFS registration skipped.");
            }

            setStep('attesting');
            const result = await attestOnChain(documentHash, "");

            if (result.success && result.txHash) {
                setTxHash(result.txHash);
                setStep('complete');
            } else {
                setError(result.error || "Blockchain commit denied");
                setStep('error');
            }
        } catch (err: any) {
            setError(err.message || "Protocol execution error");
            setStep('error');
        }
    };

    const reset = () => {
        setStep('idle');
        setUploadedPreview(null);
        setAiResult(null);
        setDocumentHash(null);
        setComputedFileHash(null);
        setComputedDataHash(null);
        setTxHash(null);
        setError(null);
        setJsonContent(null);
        setShowJson(false);
        setBulkFiles([]);
        setBulkHashes([]);
        setMerkleRoot(null);
    };

    return (
        <div className="space-y-12">
            {/* Mode Toggle + Policy */}
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-center items-center gap-4">
                    <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
                        <button onClick={() => { setMode('single'); reset(); }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'single' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Hash className="h-3.5 w-3.5" /> Single
                        </button>
                        <button onClick={() => { setMode('bulk'); reset(); }}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'bulk' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Layers className="h-3.5 w-3.5" /> Bulk (Merkle)
                        </button>
                    </div>

                    <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
                        <button onClick={() => setAnchorMode('strict')}
                            className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${anchorMode === 'strict' ? 'bg-white/10 text-white border border-white/20' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                            <span className="text-purple-400">Exact File Match</span>
                            <span className="text-[8px] font-normal opacity-70">Raw Bytes Hash</span>
                        </button>
                        <button onClick={() => setAnchorMode('easy')}
                            className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${anchorMode === 'easy' ? 'bg-white/10 text-white border border-white/20' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}>
                            <span className="text-cyan-400">Smart AI Match</span>
                            <span className="text-[8px] font-normal opacity-70">Extracted JSON Hash</span>
                        </button>
                    </div>
                </div>

                <PolicyControls policy={policy} setPolicy={setPolicy} />
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between max-w-4xl mx-auto px-4 relative mb-16">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 -z-10" />
                {[
                    { id: 'S1', label: 'Capture', active: step !== 'idle' },
                    { id: 'S2', label: 'AI Extract', active: !!aiResult || step === 'extracting' },
                    { id: 'S3', label: mode === 'bulk' ? 'Merkle Root' : 'SHA-256', active: !!documentHash || step === 'hashing' },
                    { id: 'S4', label: 'On-Chain', active: step === 'complete' || step === 'attesting' }
                ].map((s, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-3">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 ${s.active ? 'bg-cyber-gradient border-white/20 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-110' : 'bg-[#020617] border-white/5 text-slate-600'}`}>
                            <span className="font-bold text-xs font-sans">{s.id}</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${s.active ? 'text-white' : 'text-slate-600 font-medium'}`}>{s.label}</span>
                    </div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-start">
                {/* Left Column: Visual Capture */}
                <div className="space-y-8 animate-in slide-in-from-left duration-700">
                    <div className={`p-8 rounded-[2.5rem] border transition-all duration-500 overflow-hidden relative ${step === 'idle' ? 'bg-purple-500/5 border-purple-500/20 ring-1 ring-purple-500/10' : 'glassmorphism border-white/10'}`}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 glassmorphism rounded-xl flex items-center justify-center text-xs font-sans font-bold text-purple-400 border-purple-500/30">
                                    S1
                                </div>
                                <h3 className="text-xl font-bold uppercase tracking-widest text-white/90">{mode === 'bulk' ? 'Bulk_Capture' : 'Visual_Capture'}</h3>
                            </div>
                            {uploadedPreview && <div className="text-[10px] font-sans font-bold text-purple-400/60 animate-pulse uppercase tracking-[0.2em]">Stream_Active</div>}
                        </div>

                        <label className="block cursor-pointer group">
                            <div className={`relative border-2 border-dashed rounded-[2rem] p-4 min-h-[300px] flex items-center justify-center transition-all ${uploadedPreview || bulkFiles.length > 0 ? 'border-purple-500/20 bg-black/40' : 'border-white/5 hover:border-purple-500/40 hover:bg-white/5'}`}>
                                {mode === 'bulk' && bulkFiles.length > 0 ? (
                                    <div className="text-center space-y-4">
                                        <Layers className="h-16 w-16 text-cyan-400 mx-auto" />
                                        <p className="text-white font-bold text-lg">{bulkFiles.length} Documents Loaded</p>
                                        {merkleRoot && <p className="text-[10px] font-mono text-cyan-400/80 break-all bg-cyan-500/5 p-3 rounded-xl border border-cyan-500/10">Merkle Root: {merkleRoot}</p>}
                                    </div>
                                ) : uploadedPreview ? (
                                    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl shadow-2xl border border-white/5">
                                        {fileType?.startsWith('image/') ? (
                                            <div className="relative overflow-hidden">
                                                <img src={uploadedPreview} alt="Captured Source" className="w-full h-auto grayscale-[0.3] brightness-90 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700" />
                                                {step === 'extracting' && (
                                                    <div className="absolute inset-0 z-40">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_5px_30px_#22d3ee] animate-scan-slow" />
                                                        <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="aspect-[3/4] flex flex-col items-center justify-center bg-white/5 relative">
                                                <Upload className="h-16 w-16 text-purple-400 mb-4 animate-bounce" />
                                                <span className="text-white font-sans font-bold text-[10px] tracking-[0.3em] uppercase">pdf_document_synced</span>
                                                {step === 'extracting' && (
                                                    <div className="absolute inset-0 z-40 bg-cyan-500/5">
                                                        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_5px_30px_#22d3ee] animate-scan-slow" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-black/20" />
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <div className="h-20 w-20 bg-white/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 border border-white/10 text-slate-500 group-hover:text-purple-400 group-hover:scale-110 transition-all">
                                            <Upload className="h-10 w-10 transition-transform" />
                                        </div>
                                        <p className="text-white font-bold text-lg mb-2 tracking-tight">{mode === 'bulk' ? 'Select Multiple Documents' : 'Select Credential Source'}</p>
                                        <p className="text-slate-500 text-sm font-light">{mode === 'bulk' ? 'Select multiple files for batch attestation' : 'Upload certificate image or PDF'}</p>
                                    </div>
                                )}
                            </div>
                            <input type="file" className="hidden" accept="image/*,.pdf"
                                multiple={mode === 'bulk'}
                                onChange={mode === 'bulk' ? handleBulkUpload : handleFileUpload} />
                        </label>
                    </div>

                    {/* AI Extraction Block */}
                    <div className={`p-8 rounded-[2.5rem] border transition-all duration-700 relative group/parser ${step === 'extracting' ? 'bg-cyan-500/5 border-cyan-500/30 shadow-2xl shadow-cyan-500/5' : (aiResult || jsonContent) ? 'glassmorphism border-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-cyan-500/5' : 'opacity-20 grayscale pointer-events-none scale-95'}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover/parser:opacity-100 transition-opacity rounded-[2.5rem]" />
                        <div className="flex items-center gap-4 mb-8 relative z-10">
                            <div className={`h-10 w-10 glassmorphism rounded-xl flex items-center justify-center text-xs font-mono font-bold border transition-all duration-500 ${(aiResult || jsonContent) ? 'text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'text-slate-600 border-white/5'}`}>
                                S2
                            </div>
                            <h3 className="text-xl font-bold uppercase tracking-widest text-white/90">{mode === 'bulk' ? 'Batch_Data_&_JSON' : 'AI_Extraction'}</h3>
                            <div className="ml-auto flex items-center gap-3">
                                {fileName && <span className="text-[10px] font-mono text-cyan-400/60 bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-500/10 max-w-[120px] truncate">{fileName}</span>}
                            </div>
                        </div>

                        {step === 'extracting' && (
                            <div className="flex flex-col items-center py-10 space-y-4">
                                <div className="flex gap-1">
                                    {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
                                </div>
                                <span className="text-xs font-sans font-bold text-cyan-400 tracking-widest uppercase animate-pulse">{mode === 'bulk' ? 'Processing_Batch...' : 'Extracting_Data...'}</span>
                            </div>
                        )}

                        {aiResult && (
                            <div className="space-y-6 animate-in fade-in duration-1000">
                                {/* Dynamic field grid — shows ALL extracted fields */}
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(aiResult.structuredData).map(([key, value]) => (
                                        <div key={key} className={`p-3 rounded-xl bg-white/[0.02] border border-white/5 ${key.toLowerCase().includes('name') || key.toLowerCase().includes('institution') ? 'col-span-2' : ''}`}>
                                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span className="text-sm text-white font-medium">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold tracking-[0.2em] uppercase ${aiResult.documentType === 'ORIGINAL' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                        aiResult.documentType === 'PHOTOCOPY' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                            'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                        }`}>
                                        {aiResult.documentType === 'ORIGINAL' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                                        AI Detected: {aiResult.documentType}
                                    </div>
                                </div>

                                <div className="text-right group/score pt-4 border-t border-white/5">
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Extraction Confidence</span>
                                    <div className="flex items-center gap-2 justify-end">
                                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" style={{ width: `${aiResult.extractionConfidence * 100}%` }} />
                                        </div>
                                        <span className="text-cyan-400 font-sans text-xl font-bold">{(aiResult.extractionConfidence * 100).toFixed(0)}%</span>
                                    </div>
                                </div>

                                {aiResult.advisoryNotes.length > 0 && (
                                    <div className="space-y-1 pt-2">
                                        {aiResult.advisoryNotes.map((note, i) => (
                                            <p key={i} className="text-[10px] text-slate-500 pl-3 border-l border-slate-700">💡 {note}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* JSON always visible when generated (Single or Bulk) */}
                        {jsonContent && (
                            <div className="mt-4 border-t border-cyan-500/20 pt-4 animate-in fade-in duration-1000 relative z-10 glassmorphism p-4 rounded-2xl">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-bold text-slate-300 tracking-widest uppercase">
                                        {mode === 'bulk' ? 'Merkle Proof Batch (.json)' : 'Full Extraction JSON'}
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-8 bg-cyan-500/10 text-cyan-400 hover:text-white px-3 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const blob = new Blob([jsonContent], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = mode === 'bulk' ? `TAP_Merkle_Batch_${Date.now()}.json` : `TAP_Attestation_${Date.now()}.json`;
                                            a.click();
                                        }}>
                                        Download Proofs
                                    </Button>
                                </div>
                                <pre className="bg-black/60 border border-cyan-500/20 rounded-2xl p-5 text-[10px] font-mono text-cyan-300/90 overflow-auto max-h-[250px]">{jsonContent}</pre>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Hash + Chain */}
                <div className="space-y-8 animate-in slide-in-from-right duration-700">
                    {/* Hash Block */}
                    <div className={`p-8 rounded-[2.5rem] border transition-all duration-700 ${step === 'hashing' ? 'bg-purple-500/5 border-purple-500/30' : documentHash ? 'glassmorphism border-white/10' : 'opacity-20 grayscale pointer-events-none scale-95'}`}>
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-10 w-10 glassmorphism rounded-xl flex items-center justify-center text-xs font-bold text-purple-400 border-purple-500/30">S3</div>
                            <h3 className="text-xl font-bold uppercase tracking-widest text-white/90">{mode === 'bulk' ? 'Merkle_Root' : 'SHA-256_Digest'}</h3>
                        </div>
                        {documentHash && (
                            <div className="bg-black/60 rounded-[1.5rem] p-6 border border-white/5 group relative">
                                <div className={`absolute top-2 right-4 text-[8px] font-sans transition-colors uppercase tracking-widest font-bold ${anchorMode === 'strict' ? 'text-purple-400' : 'text-cyan-400'}`}>
                                    {mode === 'bulk' ? `MERKLE_ROOT (${anchorMode})` : `ALGORITHM_SHA256 (${anchorMode})`}
                                </div>
                                <p className="text-green-500 font-mono text-[10px] sm:text-xs leading-relaxed break-all p-4 bg-green-500/5 rounded-xl border border-green-500/10 hover:border-green-500/40 transition-all select-all mt-4">
                                    {documentHash}
                                </p>
                                {mode === 'bulk' && bulkHashes.length > 0 && (
                                    <p className="text-[10px] text-slate-500 mt-3 text-center">{bulkHashes.length} leaf hashes → 1 Merkle root</p>
                                )}
                                {mode === 'single' && (
                                    <p className="text-[9px] text-slate-500 mt-3 text-center">
                                        {anchorMode === 'strict'
                                            ? "Cryptographically anchored to exact file bytes (Secure against pixel-level tampering)."
                                            : "Anchored to AI-extracted JSON data (Resilient to screenshots & photocopies)."}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Blockchain Block */}
                    <div className={`p-8 rounded-[2.5rem] border transition-all duration-1000 ${step === 'attesting' ? 'bg-cyber-gradient/10 border-white/30 shadow-2xl shadow-purple-500/10' : txHash ? 'bg-green-500/[0.03] border-green-500/30' : 'opacity-20 grayscale pointer-events-none scale-95'}`}>
                        <div className="flex items-center gap-4 mb-8">
                            <div className={`h-10 w-10 glassmorphism rounded-xl flex items-center justify-center text-xs font-bold border transition-all ${txHash ? 'text-green-400 border-green-500/30' : 'text-slate-600 border-white/5'}`}>S4</div>
                            <h3 className="text-xl font-bold uppercase tracking-widest text-white/90">On-Chain_Anchor</h3>
                        </div>

                        {txHash && (
                            <div className="space-y-5 animate-in fade-in zoom-in duration-1000">
                                {/* Success Banner */}
                                <div className="flex items-center gap-4 p-5 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400">
                                    <div className="p-2 rounded-full bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                        <CheckCircle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm tracking-tight text-white">Anchored Successfully</p>
                                        <p className="text-[10px] font-sans font-bold text-green-500/80">FINALIZED ON POLYGON AMOY</p>
                                    </div>
                                </div>

                                {/* 🔒 INSTITUTION-ONLY: Full Proof of Commitment */}
                                <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Shield className="h-4 w-4 text-purple-400" />
                                        <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Proof of Commitment (Institution Only)</span>
                                    </div>

                                    {/* Extracted Data Summary */}
                                    {aiResult && (
                                        <div className="mb-4">
                                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Hashed Data</span>
                                            <div className="bg-black/60 rounded-xl p-4 border border-white/5 max-h-[200px] overflow-auto">
                                                <div className="grid grid-cols-2 gap-2">
                                                    {Object.entries(aiResult.structuredData).map(([key, value]) => (
                                                        <div key={key} className="text-[10px]">
                                                            <span className="text-slate-600 uppercase">{key}: </span>
                                                            <span className="text-slate-300 font-medium">{String(value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* SHA-256 Hash */}
                                    {documentHash && (
                                        <div className="mb-4">
                                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">SHA-256 Fingerprint</span>
                                            <p className="text-green-500 font-mono text-[10px] break-all p-3 bg-green-500/5 rounded-xl border border-green-500/10 select-all">{documentHash}</p>
                                        </div>
                                    )}

                                    {/* TX Hash */}
                                    <div>
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold block mb-2">Transaction Hash</span>
                                        <p className="text-slate-400 font-mono text-[10px] break-all p-3 bg-black/40 rounded-xl border border-white/5">{txHash}</p>
                                    </div>
                                </div>

                                {/* Polygonscan Link */}
                                <a href={`https://amoy.polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-center h-12 w-full rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:border-purple-500/40 transition-all group">
                                    <ExternalLink className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                                    View on Polygonscan
                                </a>
                            </div>
                        )}

                        {step === 'attesting' && (
                            <div className="flex flex-col items-center py-6">
                                <Loader2 className="h-10 w-10 text-purple-400 animate-spin mb-4" />
                                <p className="text-slate-400 text-xs font-mono tracking-widest animate-pulse">COMMITTING_TO_AMOY...</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="pt-4 lg:pt-8">
                        {step === 'extracted' && (
                            <Button onClick={handleAttest}
                                className="w-full h-20 rounded-[1.75rem] bg-cyber-gradient text-white font-bold text-xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 group">
                                <Cpu className="mr-3 h-7 w-7 transition-all group-hover:rotate-12" />
                                {mode === 'bulk' ? 'Commit Merkle Root' : 'Commit Attestation'}
                            </Button>
                        )}
                        {step === 'complete' && (
                            <Button onClick={reset} className="w-full h-16 rounded-[1.5rem] bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold text-lg transition-all shadow-lg">
                                <Sparkles className="mr-3 h-6 w-6 text-green-400" /> Issue New Credential
                            </Button>
                        )}
                        {error && (
                            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[1.5rem] text-red-400 flex items-start gap-4 animate-in slide-in-from-bottom-2">
                                <AlertCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-black uppercase tracking-widest">Protocol_Error</span>
                                    <span className="text-sm font-medium leading-relaxed opacity-90">{error}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DataField({ label, value, isMono = false, isSpecial = false, className = "" }: { label: string, value: string | undefined, isMono?: boolean, isSpecial?: boolean, className?: string }) {
    return (
        <div className={`space-y-1.5 group/field ${className}`}>
            <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 uppercase tracking-[.25em] font-bold block font-sans group-hover/field:text-cyan-400 transition-colors duration-300">{label}</span>
                <div className="h-[1px] flex-1 bg-white/[0.02]" />
            </div>
            <div className={`
                relative overflow-hidden px-4 py-3.5 rounded-2xl 
                transition-all duration-300 shadow-sm border
                ${isSpecial ? 'bg-gradient-to-r from-cyan-500/[0.05] to-purple-500/[0.05] border-white/5' : 'bg-white/[0.02] border-white/[0.04]'}
                ${isMono ? 'font-mono text-xs font-semibold' : 'font-sans font-semibold text-[15px] tracking-tight'}
            `}>
                <span className={`relative z-10 ${isSpecial ? 'bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 font-bold' : 'text-white/90'}`}>
                    {value || 'NOT_DECODED'}
                </span>
            </div>
        </div>
    );
}
