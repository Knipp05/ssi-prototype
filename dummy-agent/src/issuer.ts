import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { generateKeyPair, exportJWK } from "jose";
import * as crypto from "node:crypto";
import fs from "fs";

dotenv.config();

// Web Crypto API für jose setzen
if (!globalThis.crypto) {
    globalThis.crypto = crypto.webcrypto as Crypto;
}

const ISSUER_UUID = process.env.ISSUER_UUID || uuidv4();
const PRIVATE_KEY_PATH = "private.pem";
const PUBLIC_KEY_PATH = "public.pem";
const VDR_URL = process.env.VDR_URL || "http://localhost:3002";

async function checkIfIssuerRegistered(): Promise<boolean> {
    try {
        const response = await fetch(`${VDR_URL}/get-public-key/${ISSUER_UUID}`);
        const data = await response.json();
        return data.success || false;
    } catch (err) {
        console.error("Fehler beim Abrufen des Issuer-Status:", err);
        return false;
    }
}

async function registerIssuer(publicKeyJWK: object) {
    try {
        const response = await fetch(`${VDR_URL}/register-identifier`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: ISSUER_UUID, publicKey: publicKeyJWK }),
        });

        const data = await response.json();
        if (data.success) {
            console.log("Issuer erfolgreich registriert:", ISSUER_UUID);
        } else {
            console.error("Fehler bei der Registrierung des Issuers:", data.error);
        }
    } catch (err) {
        console.error("Fehler beim Senden an den VDR:", err);
    }
}

async function loadOrGenerateKeys() {
    if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
        console.log("Schlüssel existieren bereits, kein neues Paar wird erstellt.");
        return;
    }

    console.log("Erzeuge neues Schlüsselpaar...");
    const { privateKey, publicKey } = await generateKeyPair("RS256", {extractable: true});

    // Speichere den privaten Schlüssel als PEM
    const privateJWK = await exportJWK(privateKey);
    fs.writeFileSync(PRIVATE_KEY_PATH, JSON.stringify(privateJWK, null, 2));

    // Speichere den öffentlichen Schlüssel als PEM
    const publicJWK = await exportJWK(publicKey);
    fs.writeFileSync(PUBLIC_KEY_PATH, JSON.stringify(publicJWK, null, 2));

    console.log("Neues Schlüsselpaar gespeichert.");

    // Issuer beim VDR registrieren
    await registerIssuer(publicJWK);
}

export function validateSchema(data: object, schema: any): boolean {
    const { properties, required } = schema;

    // Prüfen, ob alle Pflichtfelder vorhanden sind
    for (const field of required) {
        if (!(field in data)) {
            console.error(`Fehlendes Feld: ${field}`);
            return false;
        }
    }

    // Prüfen, ob die Feldnamen und Typen korrekt sind
    for (const key of Object.keys(data)) {
        if (!(key in properties)) {
            console.error(`Unerwartetes Feld: ${key}`);
            return false;
        }

        const expectedType = properties[key].type;
        const actualType = (data as Record<string, any>)[key];

        if (expectedType === "integer" && !Number.isInteger((data as Record<string, any>)[key])) {
            console.error(`Feld ${key} sollte ein Integer sein, aber ist: ${actualType}`);
            return false;
        }

        if (expectedType !== "integer" && actualType !== expectedType) {
            console.error(`Feld ${key} sollte vom Typ ${expectedType} sein, aber ist: ${actualType}`);
            return false;
        }
    }

    return true;
}


export async function initIssuer() {
    console.log("Initialisiere Issuer...");
    console.log("Issuer UUID:", ISSUER_UUID);

    // Prüfen, ob Issuer bereits registriert ist
    const isRegistered = await checkIfIssuerRegistered();
    if (isRegistered) {
        console.log("Issuer ist bereits im VDR registriert.");
    } else {
        console.log("Issuer nicht im VDR registriert. Neuer Registrierungsvorgang...");
        await loadOrGenerateKeys();
    }
}

export async function createSchema(schemaDefinition: object) {
    const schemaId = uuidv4(); // Generiere eine neue UUID für das Schema
    const schemaHash = generateSchemaHash(schemaDefinition)

    console.log(`Erzeuge neues Schema mit ID: ${schemaId}`);

    // Prüfe, ob das Schema bereits existiert
    const isRegistered = await checkIfSchemaExists(schemaHash);
    if (isRegistered) {
        console.log("Schema ist bereits im VDR registriert.");
        return;
    }

    const schema = {
        id: schemaId,
        hash: schemaHash,
        definition: schemaDefinition
    };

    // Falls nicht registriert → Schema speichern
    await registerSchema(schema);
}

function generateSchemaHash(schema: object): string {
    return crypto.createHash("sha256").update(JSON.stringify(schema)).digest("hex");
}

// **2️⃣ Prüft, ob das Schema bereits existiert**
async function checkIfSchemaExists(schemaId: string): Promise<boolean> {
    try {
        const response = await fetch(`${VDR_URL}/get-schema/${schemaId}`);
        const data = await response.json();
        return data.success || false;
    } catch (err) {
        console.error("Fehler beim Abrufen des Schema-Status:", err);
        return false;
    }
}

// **3️⃣ Speichert das Schema im Dummy VDR**
async function registerSchema(schema: object) {
    try {
        const response = await fetch(`${VDR_URL}/register-schema`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(schema),
        });

        const data = await response.json();
        if (data.success) {
            console.log("Schema erfolgreich registriert");
        } else {
            console.error("Fehler bei der Schema-Registrierung:", data.error);
        }
    } catch (err) {
        console.error("Fehler beim Senden des Schemas an den VDR:", err);
    }
}