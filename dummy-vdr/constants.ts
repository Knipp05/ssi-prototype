import dotenv from "dotenv"

dotenv.config({ path: "../.env"});
export const PORT = 3002;
export const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
export const VDR_URL = process.env.NEXT_PUBLIC_VDR_URL || "http://localhost:3002"