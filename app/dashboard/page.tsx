"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { abi } from "@/lib/contract";
import { useAccount, useWalletClient } from "wagmi";
import {
  Hash, Clock, ShieldCheck, AlertTriangle, ExternalLink, FileText, Loader2,
  ChevronDown, ChevronUp, Copy, Check
} from "lucide-react";
import Navbar from "@/components/navbar";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DASHBOARD_CONTRACT_ADDRESS || "0xA09916427843c35a233BF355bFAF1C735F9e75fa";

interface OnChainDoc {
  docHash: string;
  issuer: string;
  issuedAt: bigint;
  revoked: boolean;
  ipfsURI: string;
}

interface LocalProof {
  hash: string;
  extractedData: Record<string, any>;
  txHash: string;
  timestamp: number;
  mode: 'single' | 'bulk';
  merkleRoot?: string;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [onChainDocs, setOnChainDocs] = useState<OnChainDoc[]>([]);
  const [localProofs, setLocalProofs] = useState<LocalProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Load on-chain docs for this wallet
  useEffect(() => {
    const loadData = async () => {
      if (!address) return;
      try {
        setLoading(true);
        const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology/");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
        const docs = await contract.listDocuments();

        // Filter to only docs issued by this wallet
        const myDocs = [...docs]
          .filter((d: any) => d.issuer.toLowerCase() === address.toLowerCase())
          .sort((a: any, b: any) => Number(b.issuedAt) - Number(a.issuedAt));
        setOnChainDocs(myDocs);

        // Load local proofs from sessionStorage
        try {
          const stored = sessionStorage.getItem('tap_attestation_history');
          if (stored) setLocalProofs(JSON.parse(stored));
        } catch { /* no local proofs */ }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [address]);

  const handleRevoke = async (hash: string) => {
    if (!walletClient) return;
    try {
      setRevoking(hash);
      const provider = new ethers.BrowserProvider(walletClient.transport);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      const gas = await contract.revokeDocument.estimateGas(hash);
      const tx = await contract.revokeDocument(hash, { gasLimit: gas + gas / 40n });
      await tx.wait();
      // Update local state
      setOnChainDocs(prev => prev.map(d => d.docHash === hash ? { ...d, revoked: true } : d));
    } catch (err) {
      console.error("Revoke error:", err);
    } finally {
      setRevoking(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Find local proof for a given hash
  const getLocalProof = (hash: string): LocalProof | undefined => {
    return localProofs.find(p => p.hash === hash);
  };

  const totalActive = onChainDocs.filter(d => !d.revoked).length;
  const totalRevoked = onChainDocs.filter(d => d.revoked).length;

  if (!isConnected) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-16 rounded-3xl max-w-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Institution Dashboard
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Connect your wallet to view your attestation history, manage credentials, and track on-chain commitments.
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Use the Connect Wallet button in the navigation bar
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[40%] h-[40%] blur-[120px] rounded-full" style={{ background: 'var(--glow-1)' }} />
        <div className="absolute bottom-0 left-0 w-[40%] h-[40%] blur-[120px] rounded-full" style={{ background: 'var(--glow-2)' }} />
      </div>

      <Navbar />

      <main className="flex-1 container py-12 max-w-7xl relative z-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
            Attestation Dashboard
          </h1>
          <p className="text-lg font-light" style={{ color: 'var(--text-secondary)' }}>
            Your on-chain attestation history and credential management.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{address}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Issued", value: onChainDocs.length, color: "var(--accent)" },
            { label: "Active", value: totalActive, color: "#22c55e" },
            { label: "Revoked", value: totalRevoked, color: "#ef4444" },
            { label: "Network", value: "Amoy", color: "var(--accent-2)" },
          ].map((stat, i) => (
            <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
              <p className="text-2xl font-black" style={{ color: stat.color }}>
                {loading ? "—" : stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Attestation Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              Your Attestations
            </h3>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'var(--table-header)' }}>
                <th className="text-left py-4 px-6 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Hash</th>
                <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Timestamp</th>
                <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Status</th>
                <th className="text-right py-4 px-6 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent)' }} />
                      <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading attestations...</span>
                    </div>
                  </td>
                </tr>
              ) : onChainDocs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <FileText className="h-12 w-12 opacity-20" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attestations found for this wallet.</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Go to the Issue page to create your first attestation.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                onChainDocs.map((doc, idx) => {
                  const isExpanded = expandedRow === doc.docHash;
                  const proof = getLocalProof(doc.docHash);
                  return (
                    <>
                      <tr key={doc.docHash} className="cursor-pointer transition-all"
                        style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }}
                        onClick={() => setExpandedRow(isExpanded ? null : doc.docHash)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--table-row-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-3">
                            <Hash className="h-4 w-4" style={{ color: 'var(--accent-2)' }} />
                            <code className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                              {doc.docHash.slice(0, 12)}...{doc.docHash.slice(-8)}
                            </code>
                            <button onClick={(e) => { e.stopPropagation(); copyToClipboard(doc.docHash); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {copiedHash === doc.docHash ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />}
                            </button>
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(Number(doc.issuedAt) * 1000).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          {doc.revoked ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-red-500 text-[10px] font-bold uppercase"
                              style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                              <AlertTriangle className="h-3 w-3" /> Revoked
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-green-500 text-[10px] font-bold uppercase"
                              style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                              <ShieldCheck className="h-3 w-3" /> Active
                            </div>
                          )}
                        </td>
                        <td className="py-5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!doc.revoked && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRevoke(doc.docHash); }}
                                disabled={revoking === doc.docHash}
                                className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase text-red-400 hover:text-red-300 transition-all"
                                style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                {revoking === doc.docHash ? <Loader2 className="h-3 w-3 animate-spin" /> : "Revoke"}
                              </button>
                            )}
                            <a href={`https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`}
                              target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                              style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                              <ExternalLink className="h-3 w-3" /> Scan
                            </a>
                            {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Detail Row */}
                      {isExpanded && (
                        <tr key={`${doc.docHash}-detail`} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td colSpan={4} className="px-6 pb-6">
                            <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)' }}>
                              <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
                                Attestation Details
                              </h4>

                              {/* Full Hash */}
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>SHA-256 Hash</span>
                                <code className="text-[11px] font-mono break-all block p-2 rounded-lg" style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                                  {doc.docHash}
                                </code>
                              </div>

                              {/* On-chain Data */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Issuer</span>
                                  <code className="text-[11px] font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{doc.issuer}</code>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Issued At</span>
                                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(Number(doc.issuedAt) * 1000).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>IPFS URI</span>
                                  <code className="text-[11px] font-mono break-all" style={{ color: 'var(--accent-2)' }}>{doc.ipfsURI || "N/A"}</code>
                                </div>
                              </div>

                              {/* Local Proof (if available from sessionStorage) */}
                              {proof && (
                                <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                                  <h5 className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--accent)' }}>
                                    📋 Local Proof Data (Session)
                                  </h5>
                                  {proof.extractedData && (
                                    <div>
                                      <span className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Extracted JSON</span>
                                      <pre className="text-[10px] font-mono p-3 rounded-lg overflow-x-auto max-h-40"
                                        style={{ background: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                                        {JSON.stringify(proof.extractedData, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {proof.txHash && (
                                    <div className="mt-3">
                                      <span className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Transaction</span>
                                      <a href={`https://amoy.polygonscan.com/tx/${proof.txHash}`} target="_blank"
                                        className="text-xs font-mono hover:underline" style={{ color: 'var(--accent-2)' }}>
                                        {proof.txHash}
                                      </a>
                                    </div>
                                  )}
                                  {proof.mode === 'bulk' && proof.merkleRoot && (
                                    <div className="mt-3">
                                      <span className="text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>Merkle Root</span>
                                      <code className="text-[11px] font-mono break-all" style={{ color: 'var(--accent)' }}>{proof.merkleRoot}</code>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Polygonscan Link */}
                              <a href={`https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80"
                                style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', color: 'var(--accent-2)' }}>
                                View on Polygonscan <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
