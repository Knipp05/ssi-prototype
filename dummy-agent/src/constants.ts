import { v4 as uuidv4 } from "uuid"
import dotenv from "dotenv"

dotenv.config({ path: "../../.env"});

export const PORT = 3001;
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
export const VDR_URL = process.env.NEXT_PUBLIC_VDR_URL || "http://localhost:3002"

export const DATABASE_PATH="./database.sqlite"
export const PRIVATE_KEY_PATH = "private.pem"
export const PUBLIC_KEY_PATH = "public.pem";
export const ISSUER_UUID = process.env.ISSUER_UUID || uuidv4();
export const TEMP_SCHEMA_ID="5b398e08-b2c6-4d4b-a127-c4250f9779ea"