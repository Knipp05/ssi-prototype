import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { PORT, VDR_URL } from "./constants";

const app = express();

app.use(cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning"]
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

    const publicJWK = {
        kty: publicKey.kty,
        n: publicKey.n,
        e: publicKey.e
    }
    if (!id || !publicJWK.kty || !publicJWK.e || !publicJWK.n) {
        res.status(400).json({ error: "ID und publicKey erforderlich" });
        return
    }

    try {
        const db = await openDB();
        await db.run("INSERT INTO identifiers (id, publicKey) VALUES (?, ?)", [id, JSON.stringify(publicJWK)]);
        res.status(201).json({ message: "Bezeichner registriert" });
        return
    } catch (err) {
        res.status(500).json({ error: "Fehler beim Speichern des Bezeichners" });
        return
    }
});


// Öffentlichen Schlüssel für eine ID abrufen
app.get("/issuer/:id", async (req, res) => {
    const { id } = req.params;
    console.log("Anfrage zu Issuer: ", id)
    const db = await openDB();
    const result = await db.get("SELECT publicKey FROM identifiers WHERE id = ?", [id]);
    console.log(result)

    if (result) {
        let publicKey;
        try {
            publicKey= JSON.parse(result.publicKey);
        } catch (err) {
            console.error("Fehler beim Parsen des Public Keys: ", err)
            res.status(500).json( { error: "Fehler beim Verarbeiten des Public Keys" })
        }
        res.status(200).json({ publicKey: publicKey });
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
app.get("/schema/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const db = await openDB();
        const result = await db.get("SELECT definition FROM schemas WHERE id = ?", [id]);

        console.log("Schema-Abfrage Ergebnis:", result);

        if (!result || !result.definition) {
            res.status(404).json({ error: "Schema nicht gefunden" });
            return;
        }

        // Sicherstellen, dass die Definition wirklich ein JSON-String ist
        let schemaData;
        try {
            schemaData = JSON.parse(result.definition);
        } catch (jsonError) {
            console.error("Fehler beim Parsen der Schema-Definition:", jsonError);
            res.status(500).json({ error: "Schema-Definition ist ungültig" });
            return;
        }
        console.log("Schemadaten: ",schemaData)
        res.status(200).json({ schema: schemaData });
    } catch (err) {
        console.error("Fehler bei der Schema-Abfrage:", err);
        res.status(500).json({ error: "Interner Serverfehler" });
    }
});

app.get("/get-schema-by-hash/:hash", async (req, res) => {
    try {
        const { hash } = req.params;
        const db = await openDB();
        const result = await db.get("SELECT id FROM schemas WHERE hash = ?", [hash]);

        console.log("Schema-Abfrage Ergebnis:", result);

        if (!result || !result.definition) {
            res.status(404).json({ error: "Schema nicht gefunden" });
            return;
        }

        // Sicherstellen, dass die Definition wirklich ein JSON-String ist
        let schemaData;
        try {
            schemaData = JSON.parse(result.definition);
        } catch (jsonError) {
            console.error("Fehler beim Parsen der Schema-Definition:", jsonError);
            res.status(500).json({ error: "Schema-Definition ist ungültig" });
            return;
        }
        console.log("Schemadaten: ",schemaData)
        res.status(200).json({ schema: schemaData });
    } catch (err) {
        console.error("Fehler bei der Schema-Abfrage:", err);
        res.status(500).json({ error: "Interner Serverfehler" });
    }
});


// Server starten
(async () => {
    await initDB();
    app.listen(PORT, () => {
        console.log(`Dummy VDR läuft auf ${VDR_URL}`);
    });
})();
