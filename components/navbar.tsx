"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount } from "wagmi";
import { Sun, Moon, Monitor } from "lucide-react";

const NAV_LINKS = [
    { href: "/", label: "Home" },
    { href: "/issuer", label: "Issue" },
    { href: "/verifier", label: "Verify" },
    { href: "/explorer", label: "Explorer" },
    { href: "/dashboard", label: "Dashboard" },
];

const THEME_OPTIONS = [
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "light", icon: Sun, label: "Light" },
    { value: "grey", icon: Monitor, label: "Grey" },
] as const;

export default function Navbar() {
    const pathname = usePathname();
    const { open } = useWeb3Modal();
    const { address } = useAccount();
    const { theme, setTheme } = useTheme();

    return (
        <header className="sticky top-0 z-50 bg-[var(--nav-bg)] backdrop-blur-2xl border-b border-[var(--border)]">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group cursor-pointer">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                        TAP
                    </div>
                    <span className="text-sm font-bold tracking-tight text-[var(--text-primary)] hidden sm:block">
                        Trustless Attestation
                    </span>
                </Link>

                {/* Nav Links */}
                <nav className="hidden md:flex items-center gap-1">
                    {NAV_LINKS.map(link => {
                        const isActive = pathname === link.href;
                        return (
                            <Link key={link.href} href={link.href}
                                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-[0.15em] transition-all ${isActive
                                        ? "bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)]"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]"
                                    }`}>
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right: Theme Toggle + Wallet */}
                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <div className="flex bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-0.5 gap-0.5">
                        {THEME_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const isActive = theme === opt.value;
                            return (
                                <button key={opt.value}
                                    onClick={() => setTheme(opt.value)}
                                    className={`p-1.5 rounded-md transition-all ${isActive
                                            ? "bg-[var(--accent-bg)] text-[var(--accent)]"
                                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        }`}
                                    title={opt.label}>
                                    <Icon className="h-3.5 w-3.5" />
                                </button>
                            );
                        })}
                    </div>

                    {/* Wallet */}
                    <Button onClick={() => open()} variant="outline"
                        className="border-[var(--border)] bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] rounded-full px-5 h-9 text-xs font-bold text-[var(--text-primary)]">
                        {address ? (
                            <div className="flex gap-2 items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse" />
                                <span className="font-mono text-[11px]">{address.slice(0, 6)}...{address.slice(-4)}</span>
                            </div>
                        ) : "Connect Wallet"}
                    </Button>
                </div>
            </div>
        </header>
    );
}
