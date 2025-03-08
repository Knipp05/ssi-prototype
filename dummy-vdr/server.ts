import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// SQLite Datenbankverbindung
async function openDB(): Promise<Database> {
    return open({
        filename: "./vdr.sqlite",
        driver: sqlite3.Database,
    });
}

// Initialisiert die Tabellen für Bezeichner & Schemata
async function initDB() {
    const db = await openDB();
    await db.exec(`
        CREATE TABLE IF NOT EXISTS identifiers (
            id TEXT PRIMARY KEY,
            publicKey TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS schemas (
            id TEXT PRIMARY KEY,
            hash TEXT NOT NULL,
            definition TEXT NOT NULL
        );
    `);
    console.log("✅ Dummy VDR initialisiert.");
}

// Öffentlichen Schlüssel für eine ID speichern
app.post("/register-identifier", async (req, res) => {
    const { id, publicKey } = req.body;
    if (!id || !publicKey) {
        res.status(400).json({ error: "ID und publicKey erforderlich" });
        return
    }

    try {
        const db = await openDB();
        await db.run("INSERT INTO identifiers (id, publicKey) VALUES (?, ?)", [id, publicKey]);
        res.json({ success: true, message: "Bezeichner registriert" });
        return
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Bezeichners" });
        return
    }
});


// Öffentlichen Schlüssel für eine ID abrufen
app.get("/get-public-key/:id", async (req, res) => {
    const { id } = req.params;
    const db = await openDB();
    const result = await db.get("SELECT publicKey FROM identifiers WHERE id = ?", [id]);

    if (result) {
        res.json({ success: true, publicKey: result.publicKey });
        return
    } else {
        res.status(404).json({ error: "Bezeichner nicht gefunden" });
        return
    }
});

// Schema registrieren
app.post("/register-schema", async (req, res) => {
    try {
        const { id, hash, definition } = req.body;
        if (!id || !hash || !definition) {
            res.status(400).json({ error: "ID, Hash und Schema erforderlich" });
            return;
        }

        const db = await openDB();

        const existingSchema = await db.get("SELECT id FROM schemas WHERE hash = ?", [hash]);

        if (existingSchema) {
            res.status(409).json({ error: "Schema mit dieser Definition existiert bereits"})
            return;
        }

        await db.run("INSERT INTO schemas (id, hash, definition) VALUES (?, ?, ?)", [id, hash, JSON.stringify(definition)]);
        res.json({ success: true, message: "Schema registriert" });
        return;
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Schemas" });
        return;
    }
});

// Schema abrufen
app.get("/get-schema/:id", async (req, res) => {
    const { id } = req.params;
    const db = await openDB();
    const result = await db.get("SELECT definition FROM schemas WHERE id = ?", [id]);

    if (result) {
        res.json({ success: true, schema: JSON.parse(result.schema) });
        return
    } else {
        res.status(404).json({ error: "Schema nicht gefunden" });
        return
    }
});

// Server starten
(async () => {
    await initDB();
    app.listen(PORT, () => {
        console.log(`✅ Dummy VDR läuft auf http://localhost:${PORT}`);
    });
})();
