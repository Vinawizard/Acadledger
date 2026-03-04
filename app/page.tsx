"use client"
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Shield, UserCircle2, Building2, FileSearch, CheckCircle, Zap, ShieldCheck,
  Search, Award, Layers, Cpu, ArrowRight, Sparkles, GraduationCap, Landmark,
  BriefcaseBusiness, Globe, HeartPulse, Hash, Brain, Lock, ChevronRight,
  Upload, Settings, Eye
} from "lucide-react";
import { useAccount } from 'wagmi'
import { motion } from "framer-motion";
import Navbar from "@/components/navbar";

export default function Home() {
  const { address } = useAccount();

  const fadeIn = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8 }
  };

  return (
    <div className="flex flex-col min-h-screen selection:bg-purple-500/30 font-sans" style={{ backgroundColor: 'var(--page-bg)', color: 'var(--text-primary)' }}>
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] blur-[140px] rounded-full animate-pulse" style={{ background: 'var(--glow-1)' }} />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] blur-[140px] rounded-full animate-pulse" style={{ background: 'var(--glow-2)' }} />
      </div>

      <Navbar />

      <main className="flex-1 relative z-10 container py-20 flex flex-col items-center">

        {/* ═══════ HERO ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center max-w-4xl mb-32"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-8 uppercase tracking-wider"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
            </span>
            Polygon Amoy • SHA-256 • Policy Engine
          </motion.div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-[1.05]">
            AI-Backed Trustless<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
              Credential Attestation
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-12">
            A policy-driven platform where institutions issue tamper-proof credentials
            and anyone can verify them — powered by deterministic SHA-256 hashing,
            AI-backed extraction, and on-chain anchoring.
          </p>

          <div className="flex flex-wrap justify-center gap-5">
            <Link href="/issuer">
              <Button className="h-16 px-10 rounded-2xl bg-cyber-gradient text-white font-bold text-lg shadow-2xl shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all group">
                <Building2 className="mr-3 h-5 w-5 group-hover:rotate-6 transition-transform" />
                Issue Credential
              </Button>
            </Link>
            <Link href="/verifier">
              <Button variant="outline" className="h-16 px-10 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold text-lg backdrop-blur-md group">
                <Search className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
                Verify Document
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ═══════ HOW IT WORKS — 3 LAYERS ═══════ */}
        <motion.div {...fadeIn} className="w-full max-w-6xl mb-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Three Verification Layers</h2>
            <p className="text-slate-500 max-w-lg mx-auto">Each credential passes through three independent checks — only the SHA-256 hash is authoritative.</p>
            <div className="h-1.5 w-20 bg-cyber-gradient mx-auto rounded-full mt-6" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Lock className="h-8 w-8" />, color: 'green',
                label: "AUTHORITATIVE", title: "Cryptographic Proof",
                desc: "SHA-256 hash of canonical data is matched against the immutable on-chain record. This is the only proof of integrity.",
                tag: "Deterministic"
              },
              {
                icon: <Brain className="h-8 w-8" />, color: 'cyan',
                label: "ADVISORY", title: "AI Extraction",
                desc: "Gemini extracts structured data, classifies document type (Original/Photocopy/Digital), and returns an extraction confidence score.",
                tag: "Confidence Score"
              },
              {
                icon: <Settings className="h-8 w-8" />, color: 'amber',
                label: "DECISION", title: "Policy Engine",
                desc: "Institution-defined rules determine the final verdict: Verified, Verified with Warning, Conditional, or Not Registered.",
                tag: "Configurable"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15, duration: 0.7 }}
                className="glassmorphism p-8 rounded-[2.5rem] hover:bg-white/10 transition-all duration-500 group relative overflow-hidden"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-${item.color}-500`} />
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-[9px] font-black uppercase tracking-[0.3em] text-${item.color}-400`}>{item.label}</span>
                  <span className={`text-[9px] px-3 py-1 rounded-full bg-${item.color}-500/10 border border-${item.color}-500/20 text-${item.color}-400 font-bold`}>{item.tag}</span>
                </div>
                <div className={`h-16 w-16 bg-${item.color}-500/10 rounded-2xl flex items-center justify-center mb-6 border border-${item.color}-500/20 text-${item.color}-400 group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ═══════ SUPPORTED INSTITUTION TYPES ═══════ */}
        <motion.div {...fadeIn} className="w-full max-w-6xl mb-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">For Every Institution</h2>
            <p className="text-slate-500 max-w-lg mx-auto">This framework supports any institution that needs tamper-proof credential issuance and verification.</p>
            <div className="h-1.5 w-20 bg-cyber-gradient mx-auto rounded-full mt-6" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {[
              { icon: <GraduationCap className="h-7 w-7" />, title: "Academic", desc: "Universities, Schools, Training Centers", color: "purple" },
              { icon: <BriefcaseBusiness className="h-7 w-7" />, title: "Corporate", desc: "Employment, Certifications, Compliance", color: "blue" },
              { icon: <Landmark className="h-7 w-7" />, title: "Financial", desc: "Bank Statements, Audit Reports", color: "cyan" },
              { icon: <Shield className="h-7 w-7" />, title: "Government", desc: "IDs, Licenses, Permits, Records", color: "green" },
              { icon: <Globe className="h-7 w-7" />, title: "International", desc: "Cross-border Credential Recognition", color: "amber" },
              { icon: <HeartPulse className="h-7 w-7" />, title: "Healthcare", desc: "Medical Licenses, Lab Reports", color: "pink" },
            ].map((inst, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.5 }}
                className={`glassmorphism p-6 rounded-[2rem] hover:bg-white/10 hover:border-${inst.color}-500/30 transition-all duration-500 group cursor-default`}
              >
                <div className={`h-14 w-14 bg-${inst.color}-500/10 rounded-xl flex items-center justify-center mb-4 text-${inst.color}-400 border border-${inst.color}-500/20 group-hover:scale-110 transition-transform`}>
                  {inst.icon}
                </div>
                <h4 className="text-lg font-bold text-white mb-1">{inst.title}</h4>
                <p className="text-slate-500 text-xs">{inst.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ═══════ INSTRUCTIONS FOR INSTITUTIONS ═══════ */}
        <motion.div {...fadeIn} className="w-full max-w-5xl mb-40">
          <div className="glassmorphism p-12 md:p-16 rounded-[4rem] border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-cyber-gradient" />

            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">How to Use This Framework</h2>
            <p className="text-slate-500 mb-12 max-w-xl">Step-by-step guide for institutions to issue and verify credentials on-chain.</p>

            <div className="grid md:grid-cols-2 gap-12">
              <div className="space-y-8">
                {[
                  { num: "A", icon: <UserCircle2 className="h-4 w-4" />, title: "Connect Institutional Wallet", desc: "Link your MetaMask or WalletConnect wallet. This wallet becomes your institutional identity on-chain." },
                  { num: "B", icon: <Upload className="h-4 w-4" />, title: "Upload Credential Document", desc: "Upload certificate as image or PDF. The AI engine extracts structured data (name, ID, type) automatically." },
                  { num: "C", icon: <Settings className="h-4 w-4" />, title: "Define Verification Policy", desc: "Set rules: allow photocopies? Require originals? Minimum extraction confidence? Strictness level?" },
                  { num: "D", icon: <Hash className="h-4 w-4" />, title: "Commit Hash On-Chain", desc: "SHA-256 fingerprint of canonical data is anchored to Polygon Amoy. Single or batch (Merkle root) mode." },
                  { num: "E", icon: <Eye className="h-4 w-4" />, title: "Share for Public Verification", desc: "Credential holders share the hash. Anyone can verify it through the public Verifier — no login needed." },
                ].map((step, i) => (
                  <div key={i} className="flex gap-5 group">
                    <div className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 font-bold shrink-0 group-hover:bg-cyan-400 group-hover:text-black transition-all">
                      {step.num}
                    </div>
                    <div>
                      <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                        {step.icon} {step.title}
                      </h4>
                      <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-center">
                <div className="glassmorphism p-8 rounded-[2.5rem] border-white/5 bg-cyber-gradient/5">
                  <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-cyan-400" />
                    Key Principle
                  </h4>
                  <p className="text-slate-400 leading-relaxed mb-6">
                    The <strong className="text-white">only thing that proves integrity</strong> is the SHA-256 hash match against the blockchain. AI scoring is advisory. Policy is the decision layer.
                  </p>
                  <ul className="space-y-3">
                    {[
                      'SHA-256 hash = proof of integrity',
                      'AI confidence = advisory only',
                      'Policy engine = institution decides',
                      'Photocopy ≠ invalid credential'
                    ].map((text, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm font-medium text-white/70">
                        <CheckCircle className="h-4 w-4 text-green-400 shrink-0" /> {text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════ TWO SIDES: ISSUER + VERIFIER ═══════ */}
        <motion.div {...fadeIn} className="grid lg:grid-cols-2 gap-10 max-w-6xl w-full items-stretch mb-32">
          <Link href="/issuer" className="group h-full">
            <div className="glassmorphism p-10 rounded-[3.5rem] hover:border-purple-500/50 hover:bg-white/10 transition-all duration-700 h-full flex flex-col items-center text-center group-hover:-translate-y-3 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-3xl -mr-16 -mt-16 group-hover:bg-purple-600/20 transition-all" />
              <div className="h-24 w-24 bg-purple-500/10 rounded-[2.5rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 border border-white/5 shadow-inner">
                <Building2 className="h-12 w-12 text-purple-400" />
              </div>
              <div className="px-4 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-black text-purple-400 uppercase tracking-widest mb-6">Institution Side</div>
              <h2 className="text-2xl font-bold mb-4 text-white tracking-tight">Issuer Portal</h2>
              <p className="text-sm text-slate-400 mb-10 leading-relaxed px-4">
                Upload credentials, define verification policies, generate SHA-256 fingerprints, and commit single or batch attestations to Polygon Amoy.
              </p>
              <Button className="mt-auto w-full h-16 rounded-[2rem] bg-cyber-gradient hover:opacity-90 font-bold text-lg shadow-xl shadow-purple-500/20">
                <ArrowRight className="mr-2 h-5 w-5" /> Open Issuer Dashboard
              </Button>
            </div>
          </Link>

          <Link href="/verifier" className="group h-full">
            <div className="glassmorphism p-10 rounded-[3.5rem] hover:border-cyan-500/50 hover:bg-white/10 transition-all duration-700 h-full flex flex-col items-center text-center group-hover:-translate-y-3 relative overflow-hidden border-dashed shadow-2xl">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-600/10 blur-3xl -ml-16 -mb-16 group-hover:bg-cyan-600/20 transition-all" />
              <div className="h-24 w-24 bg-cyan-500/10 rounded-[2.5rem] flex items-center justify-center mb-10 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700 border border-white/5 shadow-inner">
                <FileSearch className="h-12 w-12 text-cyan-400" />
              </div>
              <div className="px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-6">Public Side</div>
              <h2 className="text-2xl font-bold mb-4 text-white tracking-tight">Public Verification</h2>
              <p className="text-sm text-slate-400 mb-10 leading-relaxed px-4">
                Anyone can upload a credential and run the 3-layer verification engine — cryptographic match, AI advisory, and policy evaluation. No login required.
              </p>
              <Button variant="outline" className="mt-auto w-full h-16 rounded-[2rem] border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-bold text-lg">
                <Search className="mr-2 h-5 w-5" /> Open Verifier
              </Button>
            </div>
          </Link>
        </motion.div>

        {/* ═══════ EXPLORER CTA ═══════ */}
        <motion.div {...fadeIn} className="w-full max-w-4xl mb-20">
          <Link href="/explorer" className="block group">
            <div className="glassmorphism p-8 rounded-[2.5rem] border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                  <Layers className="h-7 w-7 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Transaction Explorer</h3>
                  <p className="text-slate-500 text-sm">View every attestation committed to the protocol in real-time.</p>
                </div>
              </div>
              <Button variant="outline" className="rounded-xl border-white/10 text-white group-hover:border-blue-500/40 px-6">
                Open Explorer <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Link>
        </motion.div>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="py-16 border-t border-white/5 w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-6 text-slate-500 text-sm font-bold tracking-tight uppercase font-mono">
            <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" /> Polygon Amoy</span>
            <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-purple-500" /> SHA-256</span>
            <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-cyan-500" /> Policy Engine</span>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-slate-600 font-bold uppercase tracking-[0.2em]">
              AI-Backed Trustless Credential Attestation
            </p>
            <p className="text-[10px] text-slate-700 font-medium">
              Protocol v3.0 • Open Source Verification Standard
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
