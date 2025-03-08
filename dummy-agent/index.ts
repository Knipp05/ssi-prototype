import express from "express";
import cors from "cors";
import { compare } from "bcrypt-ts";
import { initDB, openDB } from "./database.js";
import QRCode from "qrcode"
import multer from "multer"
import fs from "fs"
import { initIssuer } from "./issuer.js";
import dotenv from "dotenv"

dotenv.config();

const upload = multer({ dest: "uploads/" });

const app = express();
const PORT = process.env.PORT || 3001;
const DATABASE_PATH = process.env.DATABASE_PATH || "./database.sqlite"
const FRONTEND_URL = "http://192.168.178.69:3000";

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

        } catch {

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
