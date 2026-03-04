"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, FileCheck, Building2, AlertCircle, Loader2, Sparkles, ExternalLink, Cpu } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import axios from "axios";
import { ethers } from "ethers";
import { abi } from "@/lib/contract";

export default function VerifyPage() {
  const [documentId, setDocumentId] = useState<FileList | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<{
    status: "idle" | "loading" | "success" | "error";
    message?: string;
    data?: {
      recipient: {
        fullName: string;
        email: string;
        id: string;
        walletAddress: string;
      };
      document: {
        type: string;
        id: string;
        hash: string;
        description: string;
      };
      issuedAt: bigint;
      status: boolean;
      name: string;
    };
  }>({ status: "idle" });

  const handleVerify = async () => {
    if (!documentId) return;

    setVerificationState({ status: "loading" });
    const formData = new FormData();
    formData.append("pdf", documentId[0]);

    try {
      const { data } = await axios.post(
        "https://ledger.palatepals.com/verify",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const provider = new ethers.JsonRpcProvider(
        "https://rpc-amoy.polygon.technology/"
      );

      const contract = new ethers.Contract(
        "0xA09916427843c35a233BF355bFAF1C735F9e75fa",
        abi,
        provider
      );

      const result: [
        valid: boolean,
        issuer: string,
        issuedAt: bigint,
        revoked: boolean,
        ipfsURI: string
      ] = await contract.verifyDocument(data.hash);

      if (result[0] === false) {
        setVerificationState({
          status: "error",
          message: `Document verification failed. Generated hash: ${data.hash.slice(0, 16)}... Similarity score: ${data.similarity ? data.similarity : "0%"}. This indicates potential document fraud.`,
        });
        return;
      }

      const institutionResult: [
        [institutionAddress: string, metadata: string],
        [
          docHash: string,
          issuer: string,
          issuedAt: bigint,
          revoked: boolean,
          ipfsURI: string
        ][]
      ] = await contract.getInstitutionWithDocuments(result[1]);

      const metadataResponse = await axios.get("/api/register", {
        params: {
          cid: institutionResult[0][1].replace("ipfs://", ""),
        },
      });

      const { data: docData } = await axios.get<{
        data: {
          recipient: {
            fullName: string;
            email: string;
            id: string;
            walletAddress: string;
          };
          document: {
            type: string;
            id: string;
            hash: string;
            description: string;
          };
        };
      }>("/api/register", {
        params: {
          cid: result[4],
        },
      });

      if (data.similarity === "100%") {
        setVerificationState({
          status: "success",
          data: {
            ...docData["data"],
            issuedAt: result[2],
            status: result[3],
            name: metadataResponse.data["data"]["name"],
          },
        });
      } else {
        setVerificationState({
          status: "error",
          message: `Document verification failed. Generated hash: ${data.hash.slice(0, 16)}... Similarity score: ${data.similarity ? data.similarity : "0%"}`,
        });
      }
    } catch (error) {
      console.log(error);
      setVerificationState({
        status: "error",
        message: "An error occurred during verification protocol execution.",
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#020617] text-slate-50 selection:bg-cyan-500/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[35%] h-[35%] bg-cyan-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] bg-purple-600/5 blur-[120px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-cyber-gradient group-hover:scale-110 transition-transform duration-300">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Trustless Attestation</span>
            <span className="text-[10px] font-mono bg-white/5 text-slate-400 px-1.5 py-0.5 rounded border border-white/10 ml-2 uppercase">Protocol</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard">
              <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 rounded-full text-xs font-mono">
                Institution Login
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 relative z-10 container py-16 flex flex-col items-center">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/40 italic uppercase">
              Trust_Resolver
            </h1>
            <p className="text-slate-400 text-lg font-light">
              Submit academic assets for cryptographic validation against the L2 ledger.
            </p>
          </div>

          <div className="space-y-8 animate-in zoom-in duration-700">
            <Card className="glassmorphism border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-cyan-500/5">
              <CardHeader className="pt-10 pb-4 text-center">
                <CardTitle className="text-xl font-bold font-mono tracking-widest uppercase text-white/90">Protocol_Input</CardTitle>
                <CardDescription className="text-slate-500 uppercase text-[10px] font-black tracking-widest mt-1">
                  Upload PDF Source File
                </CardDescription>
              </CardHeader>
              <CardContent className="px-10 pb-6 pt-4">
                <div className="relative group">
                  <Input
                    id="document-id"
                    accept=".pdf,image/*"
                    onChange={(e) => {
                      const files = e.target.files;
                      setDocumentId(files);
                      if (files?.[0]) {
                        setFileType(files[0].type);
                        const reader = new FileReader();
                        reader.onload = (e) => setUploadedPreview(e.target?.result as string);
                        reader.readAsDataURL(files[0]);
                      }
                    }}
                    type="file"
                    className="h-20 bg-white/5 border-2 border-dashed border-white/10 rounded-3xl file:bg-white/10 file:border-0 file:text-white file:font-bold file:px-6 file:h-full file:mr-6 hover:border-cyan-500/40 hover:bg-white/[0.08] transition-all cursor-pointer text-sm"
                  />
                  {uploadedPreview && (
                    <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                          {fileType?.startsWith('image/') ? (
                            <img src={uploadedPreview} className="h-full w-full object-cover rounded-lg" />
                          ) : (
                            <FileCheck className="h-6 w-6 text-cyan-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{documentId?.[0]?.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                            {(documentId?.[0]?.size ? (documentId[0].size / 1024).toFixed(1) : 0)} KB • {fileType?.split('/')[1].toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-1/2 right-6 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                    <Cpu className="h-6 w-6 text-cyan-400" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="px-10 pb-10">
                <Button
                  className="w-full h-16 rounded-2xl bg-cyber-gradient text-white font-black text-xl shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
                  onClick={handleVerify}
                  disabled={verificationState.status === "loading" || !documentId}
                >
                  {verificationState.status === "loading" ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="animate-pulse italic">DECRYPTING_PROOF...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-6 w-6" />
                      Verify_Authenticity
                    </div>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {verificationState.status === "success" && (
              <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-700">
                <div className="p-6 rounded-[2rem] bg-green-500/10 border border-green-500/20 flex items-center gap-4 text-green-400">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)] shrink-0">
                    <FileCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h4 className="font-black italic uppercase tracking-tighter text-xl text-white">Document Authenticated</h4>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-green-500/80">State: Verified_On_Polygon</p>
                  </div>
                </div>

                <Card className="glassmorphism border-white/10 rounded-[2.5rem] p-10">
                  <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center gap-6 border-b border-white/5 mb-8">
                    <div className="h-20 w-20 rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                      <Building2 className="h-10 w-10 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white italic">
                        {verificationState.data?.name}
                      </h3>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        Authorized Issuing Authority
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="px-0 space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <DetailPill label="Document_Type" value={verificationState.data?.document.type} />
                      <DetailPill label="Recipient_Identity" value={verificationState.data?.recipient.fullName} />
                      <DetailPill label="Protocol_Timestamp" value={new Date(Number(verificationState?.data?.issuedAt) * 1000).toLocaleDateString()} />
                      <DetailPill label="Ledger_State" value={verificationState.data?.status ? "REVOKED" : "LIVE"} isStatus statusColor={verificationState.data?.status ? 'red' : 'green'} />
                    </div>

                    <div className="pt-8 border-t border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-3">IPFS_Content_Link</span>
                      <div className="p-4 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-cyan-400/80 break-all select-all flex justify-between items-center gap-4">
                        <span>ipfs://{verificationState.data?.document.hash.slice(0, 48)}...</span>
                        <ExternalLink className="h-4 w-4 shrink-0 transition-colors hover:text-white cursor-pointer" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {verificationState.status === "error" && (
              <div className="animate-in shake duration-500">
                <Alert className="bg-red-500/10 border-red-500/30 rounded-[2rem] p-8 border-2 shadow-2xl shadow-red-500/5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-7 w-7 text-red-500" />
                    </div>
                    <div>
                      <AlertTitle className="text-xl font-black italic uppercase tracking-tighter text-white mb-2">Protocol Validation Failed</AlertTitle>
                      <AlertDescription className="text-red-400/80 font-mono text-xs leading-relaxed uppercase tracking-tight">
                        {verificationState.message}
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-12 border-t border-white/5 relative z-10 w-full">
        <div className="container flex flex-col items-center gap-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-bold tracking-tight text-white uppercase italic">Trustless Attestation Verification Node</span>
          </div>
          <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
            NODE_STATE: SYNCHRONIZED • AMOY_TESTNET • ZKEVM_PROOFS
          </p>
        </div>
      </footer>
    </div>
  );
}

function DetailPill({ label, value, isStatus = false, statusColor = 'green' }: { label: string, value: string | undefined, isStatus?: boolean, statusColor?: 'red' | 'green' }) {
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block px-1">{label}</span>
      <div className={`px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-sm font-bold flex items-center gap-3 ${isStatus ? (statusColor === 'green' ? 'text-green-400 border-green-500/20 bg-green-500/5' : 'text-red-400 border-red-500/20 bg-red-500/5') : 'text-white'
        }`}>
        {isStatus && <div className={`w-2 h-2 rounded-full ${statusColor === 'green' ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-red-500 shadow-[0_0_8px_red]'}`} />}
        {value || 'NULL'}
      </div>
    </div>
  );
}
