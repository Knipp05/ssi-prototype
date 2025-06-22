import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

// ✅ `__dirname` für ES-Module definieren
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ `.env`-Pfad absolut bestimmen
const envPath = path.resolve(__dirname, "../../.env");
console.log("🌍 Lade .env von:", envPath);

dotenv.config({ path: envPath });
export const PORT = 3002;
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://ssi-example.ddns.net/"
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://ssi-example.ddns.net/api"
export const VDR_URL = process.env.NEXT_PUBLIC_VDR_URL || "https://ssi-example.ddns.net/vdr"