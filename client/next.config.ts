import type { NextConfig } from "next";
import dotenv from "dotenv";

// Lade die `.env`-Datei aus dem Root-Verzeichnis
dotenv.config({ path: "../.env" });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FRONTEND_URL: process.env.NEXT_PUBLIC_FRONTEND_URL,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
    NEXT_PUBLIC_VDR_URL: process.env.NEXT_PUBLIC_VDR_URL,
  },
};

export default nextConfig;
