import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { initDB } from "./database.js";
import QRCode from "qrcode"
import { createSchema, initIssuer, issueCredential } from "./issuer.js";
import { testCertificationSchema } from "./demo_data.js";
import { BACKEND_URL, FRONTEND_URL, PORT } from "./constants.js";
import { loginUser, verifyPresentation } from "./verifier.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server })

export const activeSessions = new Map<string, WebSocket>();
export const TEMP_SCHEMA_ID = await createSchema(testCertificationSchema) || ""

// Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning"]
}));
app.use(express.json());

// Initialisiere die Datenbank
(async () => {
    await initDB();

    await initIssuer()

    wss.on("connection", (ws) => {
        console.log("🔗 WebSocket verbunden!");
    
        ws.on("message", (message) => {
            try {
                const { type, sessionId } = JSON.parse(message.toString());

                if (type === "register-session" && sessionId) {
                    activeSessions.set(sessionId, ws);
                    console.log(`Session ${sessionId} registriert`);
                } 

            } catch (error) {
                console.error("Fehler bei WebSocket-Nachricht: ", error)
            }

            const data = JSON.parse(message.toString());
    
            if (data.type === "verification-result" && data.sessionId) {
                console.log(`✅ Verifikation erfolgreich für Session: ${data.sessionId}`);
                // Nachricht an alle verbundenen Clients senden
                wss.clients.forEach(client => {
                    client.send(JSON.stringify({
                        type: "verification-success",
                        sessionId: data.sessionId
                    }));
                });
            }
        });
    
        ws.send(JSON.stringify({ message: "Verbindung erfolgreich!" }));
    });

    app.get("/", (req, res) => {
        res.send("✅ SSI Dummy Server läuft!");
    });

    app.post("/login", (req, res) => loginUser(req, res));

    app.post("/issue-credential", (req, res) => issueCredential(req, res));

    app.post("/verify-credential", (req, res) => verifyPresentation(req, res))

    app.get("/generate-qr", async (req, res) => {
        try {
            const loginURL = `${FRONTEND_URL}/ssi-login`;
            const qrCodeDataURL = await QRCode.toDataURL(loginURL);
            res.json({ success: true, qrCode: qrCodeDataURL, url: loginURL });
        } catch (err) {
            res.status(500).json({ error: "Fehler beim Erstellen des QR-Codes" });
        }
    });

    server.listen(PORT,  () => {
        console.log(`✅ Server läuft auf ${BACKEND_URL}`);
    });
    
})();

