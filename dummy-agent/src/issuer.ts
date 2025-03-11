import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportJWK, importJWK, SignJWT } from "jose";
import { Request, Response, NextFunction } from "express"
import * as crypto from "node:crypto";
import fs from "fs";
import { VDR_URL, ISSUER_UUID, PUBLIC_KEY_PATH, PRIVATE_KEY_PATH, JWT_SECRET } from "./constants.js";
import jwt from "jsonwebtoken"
import { TEMP_SCHEMA_ID } from "./index.js";

// Web Crypto API für jose setzen
if (!globalThis.crypto) {
    globalThis.crypto = crypto.webcrypto as Crypto;
}

async function checkIfIssuerRegistered(): Promise<boolean> {
    try {
        const response = await fetch(`${VDR_URL}/issuer/${ISSUER_UUID}`, {
            method: "GET",
            headers: {
              "ngrok-skip-browser-warning": "true",
              "Content-Type": "application/json",
            },
          });
          return response.ok
    } catch (err) {
        console.error("Fehler beim Abrufen des Issuer-Status:", err);
        return false;
    }
}

async function registerIssuer(publicKeyJWK: object): Promise<void> {
    try {
        const response = await fetch(`${VDR_URL}/register-identifier`, {
            method: "POST",
            headers: {
                "ngrok-skip-browser-warning": "true", 
                "Content-Type": "application/json" },
            body: JSON.stringify({ id: ISSUER_UUID, publicKey: publicKeyJWK }),
        });

        if (response.ok) {
            console.log("Issuer erfolgreich registriert:", ISSUER_UUID);
        } else {
            console.error("Fehler bei der Registrierung des Issuers");
        }
    } catch (err) {
        console.error("Fehler beim Senden an den VDR:", err);
    }
}

async function loadOrGenerateKeys(): Promise<void> {
    let publicJWK;

    // **1️⃣ Issuer immer registrieren, egal ob Schlüssel existieren oder nicht**
    if (fs.existsSync(PUBLIC_KEY_PATH)) {
        publicJWK = JSON.parse(fs.readFileSync(PUBLIC_KEY_PATH, "utf8"));
    } else {
        console.log("Es existiert noch kein Public Key. Generiere neuen Schlüssel...");
        const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });

        // **Speichere den privaten Schlüssel**
        const privateJWK = await exportJWK(privateKey);
        fs.writeFileSync(PRIVATE_KEY_PATH, JSON.stringify(privateJWK, null, 2));

        // **Speichere den öffentlichen Schlüssel**
        publicJWK = await exportJWK(publicKey);
        fs.writeFileSync(PUBLIC_KEY_PATH, JSON.stringify(publicJWK, null, 2));

        console.log("Neues Schlüsselpaar gespeichert.");
    }

    // **2️⃣ Issuer beim VDR registrieren**
    await registerIssuer(publicJWK);
}


export function validateSchema(data: object, schema: any): boolean {
    console.log("Eingehende Daten:", data);
    console.log("Erwartetes Schema:", schema);

    // Prüfen, ob die Feldnamen und Typen korrekt sind
    for (const key of Object.keys(schema)) {
        console.log(`Prüfe, ob ${key} in den Daten vorhanden ist`);

        if (!(key in data)) {
            console.error(`Fehlendes Feld: ${key}`);
            return false;
        }

        const expectedType = schema[key].type;
        const actualValue = (data as Record<string, any>)[key];
        const actualType = typeof actualValue;

        // 🔹 Sonderfall: "integer" vs. "number"
        if (expectedType === "integer") {
            if (!Number.isInteger(actualValue)) {
                console.error(`Feld ${key} sollte ein Integer sein, aber ist: ${actualValue} (Typ: ${actualType})`);
                return false;
            }
        } else {
            if (actualType !== expectedType) {
                console.error(`Feld ${key} sollte vom Typ ${expectedType} sein, aber ist: ${actualType}`);
                return false;
            }
        }
    }

    console.log("Schema-Validierung erfolgreich!");
    return true;
}


export async function initIssuer(): Promise<void> {
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

export async function createSchema(schemaDefinition: object): Promise<string> {
    const schemaHash = generateSchemaHash(schemaDefinition)

    // Prüfe, ob das Schema bereits existiert
    const existingSchemaId = await checkIfSchemaExists(schemaHash);
    if (existingSchemaId) {
        console.log("Schema ist bereits im VDR registriert. ID: ", existingSchemaId);
        return existingSchemaId;
    }
    const schemaId = uuidv4();
    console.log(`Erzeuge neues Schema mit ID: ${schemaId}`);

    const schema = {
        id: schemaId,
        hash: schemaHash,
        definition: schemaDefinition
    };

    // Falls nicht registriert → Schema speichern
    await registerSchema(schema);
    return schemaId
}

function generateSchemaHash(schema: object): string {
    return crypto.createHash("sha256").update(JSON.stringify(schema)).digest("hex");
}

// **2️⃣ Prüft, ob das Schema bereits existiert**
async function checkIfSchemaExists(schemaHash: string): Promise<string | null> {
    try {
        const response = await fetch(`${VDR_URL}/schema/id-by-hash`, {
            method: "POST",
            headers: {
              "ngrok-skip-browser-warning": "true",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ hash: schemaHash })
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.id
        }
        return null
    } catch (err) {
        console.error("Fehler beim Abrufen des Schema-Status:", err);
        return null;
    }
}

// **3️⃣ Speichert das Schema im Dummy VDR**
async function registerSchema(schema: object) {
    try {
        const response = await fetch(`${VDR_URL}/register-schema`, {
            method: "POST",
            headers: { 
                "ngrok-skip-browser-warning": "true",
                "Content-Type": "application/json" 
            },
            body: JSON.stringify(schema),
        });

        // 🔹 JSON-Antwort nur EINMAL auslesen
        const data = await response.json();
        console.log("Antwort: ", data);

        if (response.ok) {
            console.log("Schema erfolgreich registriert");
        } else {
            console.error("Fehler bei der Schema-Registrierung:", data.message);
        }
    } catch (err) {
        console.error("Fehler beim Senden des Schemas an den VDR:", err);
    }
}

export function issueJWT(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h"})
}

export async function issueCredential(req: Request, res: Response) {
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

        if (!userResponse.ok) {
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

        if (!schemaResponse.ok) {
            res.status(404).json({ error: "Schema nicht gefunden" });
            return;
        }
        const schemaData = await schemaResponse.json();
        console.log("Schemadaten: ", schemaData)

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
            issuer: `/issuer/${ISSUER_UUID}`,
            issuanceDate: new Date().toISOString(),
            credentialSubject: demoCredentialSubject,
            credentialSchema: {
                id: `/schema/${schemaId}`,
            }
        };

        // Credential signieren
        const proof = {
            type: "JsonWebSignature2020",
            created: new Date().toISOString(),
            proofPurpose: "assertionMethod",
            verificationMethod: `/issuer/${ISSUER_UUID}#key-1`,
            jws: await new SignJWT(credential)
            .setProtectedHeader({ alg: "RS256" })
            .sign(await importJWK(privateKeyJWK, "RS256"))
        }
        
        const signedCredential = {
            ...credential,
            proof: proof
        }

        res.status(200).json({ signedCredential });
        return;

    } catch (err) {
        console.error("Fehler bei der Credential-Erstellung:", err);
        res.status(500).json({ error: "Fehler bei der Credential-Ausstellung" });
        return;
    }
}
