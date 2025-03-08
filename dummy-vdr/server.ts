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
            schema TEXT NOT NULL
        );
    `);
    console.log("✅ Dummy VDR initialisiert.");
}

// Öffentlichen Schlüssel für eine ID speichern
app.post("/register-identifier", async (req, res) => {
    const { id, publicKey } = req.body;
    if (!id || !publicKey) {
        res.status(400).json({ error: "ID und publicKey erforderlich" });
    }

    try {
        const db = await openDB();
        await db.run("INSERT INTO identifiers (id, publicKey) VALUES (?, ?)", [id, publicKey]);
        res.json({ success: true, message: "Bezeichner registriert" });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Bezeichners" });
    }
});


// Öffentlichen Schlüssel für eine ID abrufen
app.get("/get-public-key/:id", async (req, res) => {
    const { id } = req.params;
    const db = await openDB();
    const result = await db.get("SELECT publicKey FROM identifiers WHERE id = ?", [id]);

    if (result) {
        res.json({ success: true, publicKey: result.publicKey });
    } else {
        res.status(404).json({ error: "Bezeichner nicht gefunden" });
    }
});

// Schema registrieren
app.post("/register-schema", async (req, res) => {
    const { id, schema } = req.body;
    if (!id || !schema) {
        res.status(400).json({ error: "ID und Schema erforderlich" });
    }

    try {
        const db = await openDB();
        await db.run("INSERT INTO schemas (id, schema) VALUES (?, ?)", [id, JSON.stringify(schema)]);
        res.json({ success: true, message: "Schema registriert" });
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Schemas" });
    }
});

// Schema abrufen
app.get("/get-schema/:id", async (req, res) => {
    const { id } = req.params;
    const db = await openDB();
    const result = await db.get("SELECT schema FROM schemas WHERE id = ?", [id]);

    if (result) {
        res.json({ success: true, schema: JSON.parse(result.schema) });
    } else {
        res.status(404).json({ error: "Schema nicht gefunden" });
    }
});

// Server starten
(async () => {
    await initDB();
    app.listen(PORT, () => {
        console.log(`✅ Dummy VDR läuft auf http://localhost:${PORT}`);
    });
})();
