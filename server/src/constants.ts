import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../../../.env");
console.log("🌍 Lade .env von:", envPath);

dotenv.config({ path: envPath });
dotenv.config();

export const PORT = 3001;
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://ssi-example.ddns.net";
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://ssi-example.ddns.net/api";
export const VDR_URL = process.env.NEXT_PUBLIC_VDR_URL || "https://ssi-example.ddns.net/vdr";

export const DATABASE_PATH = process.env.DATABASE_PATH || "./database.sqlite";
export const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || "./private.pem";
export const PUBLIC_KEY_PATH = process.env.PUBLIC_KEY_PATH || "public.pem";
export const ISSUER_UUID = process.env.ISSUER_UUID || `did:example:${uuidv4()}`;
export const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwt"
