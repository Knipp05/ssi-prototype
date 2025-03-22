import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

// ✅ `__dirname` für ES-Module definieren
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ `.env`-Pfad absolut bestimmen
const envPath = path.resolve(__dirname, "../../../.env");
console.log("🌍 Lade .env von:", envPath);

dotenv.config({ path: envPath });
dotenv.config();

// ✅ Variablen exportieren
export const PORT = 3001;
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
export const VDR_URL = process.env.NEXT_PUBLIC_VDR_URL || "http://localhost:3002";

export const DATABASE_PATH = process.env.DATABASE_PATH || "./database.sqlite";
export const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || "./private.pem";
export const PUBLIC_KEY_PATH = process.env.PUBLIC_KEY_PATH || "public.pem";
export const ISSUER_UUID = process.env.ISSUER_UUID || `did:example:${uuidv4()}`;
export const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt"
