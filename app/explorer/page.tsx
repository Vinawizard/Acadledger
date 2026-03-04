"use client"

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { abi } from "@/lib/contract";
import {
    Search, ExternalLink, Clock, ShieldCheck, AlertTriangle, Hash, User, WifiOff
} from "lucide-react";
import Navbar from "@/components/navbar";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_DASHBOARD_CONTRACT_ADDRESS || "0xA09916427843c35a233BF355bFAF1C735F9e75fa";

interface BlockchainDocument {
    docHash: string;
    issuer: string;
    issuedAt: bigint;
    revoked: boolean;
    ipfsURI: string;
}

export default function ExplorerPage() {
    const [documents, setDocuments] = useState<BlockchainDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [network, setNetwork] = useState<"PUBLIC" | "LOCAL">("PUBLIC");
    const [error, setError] = useState<string | null>(null);

    const RPC_URL = network === "PUBLIC"
        ? "https://rpc-amoy.polygon.technology/"
        : "http://localhost:8549";

    useEffect(() => {
        const fetchAllDocs = async () => {
            try {
                setLoading(true);
                setError(null);
                const provider = new ethers.JsonRpcProvider(RPC_URL);

                await Promise.race([
                    provider.getNetwork(),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("NETWORK_UNREACHABLE")), 4000))
                ]);

                const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
                const docs = await contract.listDocuments();
                const sortedDocs = [...docs].sort((a: any, b: any) => Number(b.issuedAt) - Number(a.issuedAt));
                setDocuments(sortedDocs);
            } catch (err: any) {
                console.error("Ledger Sync Error:", err);
                setError(network === "LOCAL"
                    ? "Local Node Unreachable. Ensure Docker eth-node1 is running at port 8549."
                    : "Public RPC Connection Failed. Check your internet or try again later.");
                setDocuments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAllDocs();
    }, [network, RPC_URL]);

    const filteredDocs = documents.filter(doc =>
        doc.docHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.issuer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalActive = documents.filter(d => !d.revoked).length;
    const totalRevoked = documents.filter(d => d.revoked).length;

    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
            {/* Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] blur-[120px] rounded-full" style={{ background: 'var(--glow-1)' }} />
                <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] blur-[120px] rounded-full" style={{ background: 'var(--glow-2)' }} />
            </div>

            <Navbar />

            <main className="container py-12 relative z-10">
                {/* Page Title */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2" style={{ color: 'var(--text-primary)' }}>
                            Global Ledger Explorer
                        </h1>
                        <p className="text-lg font-light" style={{ color: 'var(--text-secondary)' }}>
                            Real-time audit of all credential anchors committed to the protocol.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Network Toggle */}
                        <div className="flex p-1 gap-1 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                            <button
                                onClick={() => setNetwork("PUBLIC")}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${network === "PUBLIC" ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg' : ''}`}
                                style={network !== "PUBLIC" ? { color: 'var(--text-muted)' } : {}}
                            >
                                Public Amoy
                            </button>
                            <button
                                onClick={() => setNetwork("LOCAL")}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${network === "LOCAL" ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg' : ''}`}
                                style={network !== "LOCAL" ? { color: 'var(--text-muted)' } : {}}
                            >
                                Local Node
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: "Total Attestations", value: documents.length, color: "var(--accent)" },
                        { label: "Active", value: totalActive, color: "#22c55e" },
                        { label: "Revoked", value: totalRevoked, color: "#ef4444" },
                        { label: "Network", value: network === "PUBLIC" ? "Amoy" : "Local", color: "var(--accent-2)" },
                    ].map((stat, i) => (
                        <div key={i} className="p-5 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                            <p className="text-2xl font-black" style={{ color: stat.color }}>
                                {loading ? "—" : stat.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full max-w-md mb-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Filter by Hash or Issuer..."
                        className="w-full h-12 rounded-2xl pl-12 pr-4 text-sm focus:outline-none transition-all"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-8 p-6 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4"
                        style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <WifiOff className="h-5 w-5 text-red-500" />
                        <div>
                            <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Connection Error</p>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                    <table className="w-full">
                        <thead>
                            <tr style={{ background: 'var(--table-header)' }}>
                                <th className="text-left py-5 px-6 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Document Fingerprint</th>
                                <th className="text-left py-5 px-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Issuer</th>
                                <th className="text-left py-5 px-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Timestamp</th>
                                <th className="text-left py-5 px-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Status</th>
                                <th className="text-right py-5 px-6 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Audit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={5} className="py-8 text-center text-xs font-mono uppercase tracking-widest animate-pulse" style={{ color: 'var(--text-muted)' }}>
                                            Hydrating Ledger Stream...
                                        </td>
                                    </tr>
                                ))
                            ) : filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Hash className="h-12 w-12 opacity-20" style={{ color: 'var(--text-muted)' }} />
                                            <p className="font-bold uppercase tracking-widest text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {error ? "Data Fetch Blocked" : "No records found matching query"}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDocs.map((doc, idx) => (
                                    <tr key={idx} className="group transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--table-row-hover)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                        <td className="py-5 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                                                    <Hash className="h-4 w-4" style={{ color: 'var(--accent-2)' }} />
                                                </div>
                                                <code className="text-xs font-mono px-2 py-1 rounded-md" style={{ background: 'var(--hover-bg)', color: 'var(--text-secondary)' }}>
                                                    {doc.docHash.slice(0, 10)}...{doc.docHash.slice(-8)}
                                                </code>
                                            </div>
                                        </td>
                                        <td className="py-5 px-4">
                                            <div className="flex items-center gap-2">
                                                <User className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                                                <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                                                    {doc.issuer.slice(0, 6)}...{doc.issuer.slice(-4)}
                                                </span>
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
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-red-500 text-[10px] font-bold uppercase tracking-widest"
                                                    style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                    <AlertTriangle className="h-3 w-3" />
                                                    Revoked
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-green-500 text-[10px] font-bold uppercase tracking-widest"
                                                    style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                                    <ShieldCheck className="h-3 w-3" />
                                                    Valid
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-5 px-6 text-right">
                                            <a
                                                href={network === "PUBLIC" ? `https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}` : "#"}
                                                target="_blank"
                                                className="inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-80"
                                                style={{ background: 'var(--hover-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                                Details <ExternalLink className="ml-2 h-3 w-3" />
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-20 py-12" style={{ borderTop: '1px solid var(--border)', background: 'var(--nav-bg)' }}>
                <div className="container flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${error ? "bg-red-500" : "bg-green-500 animate-pulse"}`} />
                            {network === "PUBLIC" ? "Public Amoy Sync" : "Local Node Sync"} {error ? "Offline" : "Active"}
                        </div>
                    </div>
                    <div>© 2025 Trustless Attestation Protocol • Open Source Verification</div>
                </div>
            </footer>
        </div>
    );
}
