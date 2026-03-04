import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { cookieStorage, createStorage } from "wagmi";
import { } from "wagmi/chains";

export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

if (!projectId) throw new Error("Project ID is not defined");

export const metadata = {
  name: "Trustless Attestation Protocol",
  description: "AI-Backed Trustless Credential Attestation",
  url: "http://localhost:3000",
  icons: ["/New Project 100 [31F474F].png"],
};

export const config = defaultWagmiConfig({
  chains: [{
    id: 80002,
    name: "Polygon Amoy",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["https://rpc-amoy.polygon.technology/"],
      },
      public: {
        http: ["https://rpc-amoy.polygon.technology/"],
      },
    },
    blockExplorers: {
      default: {
        name: "PolygonScan",
        url: "https://amoy.polygonscan.com",
      },
    },
    testnet: true,
  }],
  projectId,
  metadata,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});