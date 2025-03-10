import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import { compare } from "bcrypt-ts";
import { initDB, openDB } from "./database.js";
import QRCode from "qrcode"
import fs from "fs"
import { createSchema, initIssuer, validateSchema } from "./issuer.js";
import { enrolmentCertificationSchema, testCertificationSchema } from "./demo_data.js";
import { v4 as uuidv4 } from "uuid";
import { importJWK, SignJWT } from "jose";
import { BACKEND_URL, FRONTEND_URL, ISSUER_UUID, PORT, PRIVATE_KEY_PATH, VDR_URL } from "./constants.js";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server })

const sessions = new Set<string>();

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

    const TEMP_SCHEMA_ID = await createSchema(testCertificationSchema) || ""

    wss.on("connection", (ws) => {
        console.log("🔗 WebSocket verbunden!");
    
        ws.on("message", (message) => {
            const data = JSON.parse(message.toString());
    
            if (data.type === "register-session" && data.sessionId) {
                console.log(`📡 Session registriert: ${data.sessionId}`);
                sessions.add(data.sessionId);
            }
    
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

    // Benutzer-Login (ohne Hashing, nur als Dummy)
    app.post("/login", async (req, res) => {
        const { username, password } = req.body;

        try {
            const db = await openDB();
            const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

            if (user && await compare(password, user.password)) {
                res.json({ success: true, message: "Login erfolgreich", user });
                return;
            } else {
                res.status(401).json({ error: "Ungültige Anmeldedaten" });
                return;
            }
        } catch (err) {
            res.status(500).json({ error: "Fehler beim Login" });
            return;
        }
    });

    app.get("/create-session", (req, res) => {
        const sessionId = uuidv4();
        sessions.add(sessionId);
        res.status(201).json({ sessionId });
    });

    app.post("/issue-credential", async (req, res) => {
        const { holderId } = req.body;
        console.log("Anfrage zur Ausstellung von: ", holderId)
        //const { schemaId, holderId, data } = req.body;

        try {
    
            /* if (!schemaId || !holderId || !data) {
                res.status(400).json({ error: "Schema ID, Holder ID und Credential-Daten erforderlich" });
                return;
            } */  
            if (!holderId) {
                res.status(400).json({ error: "Holder ID erforderlich" });
                return;
            }

            const userResponse = await fetch(`${VDR_URL}/issuer/${holderId}`, {
                method: "GET",
                headers: {
                  "ngrok-skip-browser-warning": "true",
                  "Content-Type": "application/json",
                },
              });
            const userData = await userResponse.json();
            if (userData.error) {
                res.status(404).json({ error: "Benutzer-Identifier nicht gefunden" });
                return;
            }

            const schemaId = TEMP_SCHEMA_ID //zunächst hardcoded
            console.log("Schema ID: ", schemaId)
            const demoCredentialSubject = {
                id: holderId,
                name: "Niklas",
                age: 24,
                registration_number: 82419
            }
    
            // Prüfen, ob das Schema existiert
            const schemaResponse = await fetch(`${VDR_URL}/schema/${schemaId}`, {
                method: "GET",
                headers: {
                  "ngrok-skip-browser-warning": "true",
                  "Content-Type": "application/json",
                },
              });
            const schemaData = await schemaResponse.json();
            if (schemaData.error) {
                res.status(404).json({ error: "Schema nicht gefunden" });
                return;
            }

            if (!validateSchema(demoCredentialSubject, schemaData.schema)) {
                res.status(400).json({ error: "Daten entsprechen nicht dem Schema"})
                return;
            }
    
            // Laden des privaten Schlüssels des Issuers
            if (!fs.existsSync(PRIVATE_KEY_PATH)) {
                res.status(500).json({ error: "Privater Schlüssel des Issuers fehlt" });
                return;
            }
            const privateKeyJWK = JSON.parse(fs.readFileSync(PRIVATE_KEY_PATH, "utf8"));

            // Credential-Objekt erstellen
            const credential = {
                id: uuidv4(),
                type: [ "VerifiableCredential", "EnrolmentCredential"],
                issuer: `${VDR_URL}/issuer/${ISSUER_UUID}`,
                issuanceDate: new Date().toISOString(),
                credentialSubject: demoCredentialSubject,
                credentialSchema: {
                    id: `${VDR_URL}/schema/${schemaId}`,
                }
            };
    
            // Credential signieren
            const proof = await new SignJWT(credential)
                .setProtectedHeader({ alg: "RS256" })
                .sign(await importJWK(privateKeyJWK, "RS256"));
            
            const signedCredential = {
                credential,
                proof: proof
            }
    
            res.status(200).json({ credential: signedCredential });
            return;
    
        } catch (err) {
            console.error("Fehler bei der Credential-Erstellung:", err);
            res.status(500).json({ error: "Fehler bei der Credential-Ausstellung" });
            return;
        }
    });
   
    

    app.get("/generate-qr", async (req, res) => {
        try {
            const loginURL = `${FRONTEND_URL}/ssi-login`; // Simulierte Login-URL
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

