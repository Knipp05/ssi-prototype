import express from "express";
import cors from "cors";
import { compare } from "bcrypt-ts";
import { initDB, openDB } from "./database.js";
import QRCode from "qrcode"
import multer from "multer"
import fs from "fs"
import { createSchema, initIssuer, validateSchema } from "./issuer.js";
import dotenv from "dotenv"
import { enrolmentCertificationSchema } from "./demo_data.js";
import { v4 as uuidv4 } from "uuid";
import { importJWK, SignJWT } from "jose";

dotenv.config();

const upload = multer({ dest: "uploads/" });

const app = express();
const PORT = process.env.PORT || 3001;
const DATABASE_PATH = process.env.DATABASE_PATH || "./database.sqlite"
const FRONTEND_URL = "http://192.168.178.69:3000";
const PRIVATE_KEY_PATH = "private.pem"
const VDR_URL = process.env.VDR_URL || "http://localhost:3002"

// Middleware
app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Initialisiere die Datenbank
(async () => {
    await initDB();

    await initIssuer()

    await createSchema(enrolmentCertificationSchema)

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
            } else {
                res.status(401).json({ error: "Ungültige Anmeldedaten" });
            }
        } catch (err) {
            res.status(500).json({ error: "Fehler beim Login" });
        }
    });

    app.post("/upload-credential", upload.single("credential"), async (req, res, next) => {
        try {
            if (!req.file) {
                res.status(400).json({ error: "Keine Datei hochgeladen" });
            } else {
                const credentialData = JSON.parse(req.file.buffer.toString("utf8"));
    
                console.log("Erhaltenes Credential:", credentialData);
        
                // Dummy-Prüfung (später ersetzen mit Signaturprüfung)
                if (credentialData.issuer && credentialData.claim) {
                    res.json({ success: true, message: "Valid Credential", data: credentialData });
                } else {
                    res.status(400).json({ error: "Ungültiges Credential-Format" });
                }
            }
    
            // Datei als JSON einlesen (aus Buffer statt aus Datei)
            
        } catch (err) {
            next(err); // Fehler weiterleiten, damit Express ihn behandelt
        }
    });

    app.post("/issue-credential", async (req, res) => {
        try {
            const { schemaId, holderId, data } = req.body;
    
            if (!schemaId || !holderId || !data) {
                res.status(400).json({ error: "Schema ID, Holder ID und Credential-Daten erforderlich" });
                return;
            }
    
            // Prüfen, ob das Schema existiert
            const schemaResponse = await fetch(`${VDR_URL}/get-schema/${schemaId}`);
            const schemaData = await schemaResponse.json();
            if (!schemaData.success) {
                res.status(404).json({ error: "Schema nicht gefunden" });
                return;
            }

            if (!validateSchema(data, schemaData.schema)) {
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
            const credentialData = {
                id: uuidv4(),
                schema: schemaId,
                issuer: process.env.ISSUER_UUID,
                holder: holderId,
                issuedAt: new Date().toISOString(),
                data
            };
    
            // Credential signieren
            const proof = await new SignJWT(credentialData)
                .setProtectedHeader({ alg: "RS256" })
                .sign(await importJWK(privateKeyJWK, "RS256"));
            
            const credential = {
                credentialData,
                proof: proof
            }
    
            res.json({ success: true, credential: credential });
            return;
    
        } catch (err) {
            console.error("Fehler bei der Credential-Erstellung:", err);
            res.status(500).json({ error: "Fehler bei der Credential-Ausstellung" });
            return;
        }
    })
    

    app.get("/generate-qr", async (req, res) => {
        try {
            const loginURL = `${FRONTEND_URL}/ssi-login`; // Simulierte Login-URL
            const qrCodeDataURL = await QRCode.toDataURL(loginURL);
            res.json({ success: true, qrCode: qrCodeDataURL, url: loginURL });
        } catch (err) {
            res.status(500).json({ error: "Fehler beim Erstellen des QR-Codes" });
        }
    });

    app.listen(PORT,  () => {
        console.log(`✅ Server läuft auf http://localhost:${PORT}`);
    });
    
})();
