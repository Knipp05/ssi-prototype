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
