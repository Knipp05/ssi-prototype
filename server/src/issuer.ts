import { v4 as uuidv4 } from "uuid";
import { generateKeyPair, exportJWK, importJWK, SignJWT } from "jose";
import { Request, Response } from "express"
import * as crypto from "node:crypto";
import fs from "fs";
import { VDR_URL, ISSUER_UUID, PUBLIC_KEY_PATH, PRIVATE_KEY_PATH, JWT_SECRET, FRONTEND_URL } from "./constants.js";
import jwt from "jsonwebtoken"
import { activeSessions, activeUsers, activeWallets, pendingOffers, supportedSchemas } from "./index.js";
import { supportedCredentials } from "./demo_data.js";
import { CredentialOffer } from "./types.js";
import { openDB } from "./database.js";
import { validateSchema } from "./verifier.js";

if (!globalThis.crypto) {
    globalThis.crypto = crypto.webcrypto as Crypto;
}

export async function initIssuer(): Promise<void> {
    console.log("Initialisiere Issuer...");
    console.log("Issuer UUID:", ISSUER_UUID);

    const isRegistered = await checkIfIssuerRegistered();
    if (isRegistered) {
        console.log("Issuer ist bereits im VDR registriert.");
    } else {
        console.log("Issuer nicht im VDR registriert. Neuer Registrierungsvorgang...");
        await loadOrGenerateKeys();
    }
}

export async function initSupportedSchemas(): Promise<Map<string, string>> {
    console.log("🔍 Prüfe, ob alle notwendigen Schemata registriert sind...");
    const supportedSchemas = new Map<string, string>();

    for (const [type, schemaDefinition] of Object.entries(supportedCredentials)) {
        const schemaHash = generateSchemaHash(schemaDefinition);
        const existingSchemaId = await checkIfSchemaExists(schemaHash);

        if (existingSchemaId) {
            console.log(`✅ Schema ${type} existiert bereits mit ID: ${existingSchemaId}`);
            supportedSchemas.set(type, existingSchemaId)
        } else {
            console.log(`⚠️ Schema ${type} nicht gefunden. Registriere neu...`);
            const newSchemaId = await createSchema(schemaDefinition);
            console.log(`📌 Neues Schema ${type} registriert mit ID: ${newSchemaId}`);
            supportedSchemas.set(type, newSchemaId)
        }
    }
    return supportedSchemas
}

export function issueJWT(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h"})
}

export async function offerCredential(req: Request, res: Response) {
    const { sessionId, schemaType } = req.body;
    if (!sessionId || !schemaType) {
        res.status(400).json({ message: "Session ID und Schema Typ  erforderlich" });
        return;
    }

   let offerId = [...pendingOffers.entries()]
        .find(([_, offer]) => offer.sessionId === sessionId)?.[0];
    
    if (!offerId) {
        offerId = uuidv4();
    }

    const schemaId = supportedSchemas.get(schemaType)

    if(!schemaId) {
        res.status(404).json({ message: "Schema nicht gefunden!"})
        return;
    }

    const offer: CredentialOffer = {
        offerId,
        schemaType,
        issuerId: ISSUER_UUID,
        sessionId
    };

    if (activeWallets.has(sessionId)) {
        console.log("Wallet aktiv, direkt senden.");
        pendingOffers.set(offerId, offer)
        activeWallets.get(sessionId)?.send(JSON.stringify({type: "credential-offer", offer: offer}));
        res.status(200).json({ message: "Offer direkt an Wallet gesendet" });
    } else {
        console.log("Wallet nicht aktiv. Zeige QR-Code zur Öffnung:", offerId);
        pendingOffers.set(offerId, offer)
        const walletUrl = `${FRONTEND_URL}/wallet?sessionId=${sessionId}`;
        res.status(200).json({ url: walletUrl})
    }
}

export async function acceptCredentialOffer(req: Request, res: Response) {
    const { offerId, walletDid } = req.body;
    if (!offerId || !walletDid) {
        res.status(400).json({ message: "Offer ID, Wallet DID, Schema ID erforderlich" });
        return;
    }

    const credentialOffer = pendingOffers.get(offerId);
    console.log(credentialOffer)
    if (!credentialOffer) {
        res.status(404).json({ message: "Credential Offer nicht gefunden oder abgelaufen" });
        return;
    }

    if (!(activeWallets.has(credentialOffer.sessionId))) {
        console.log("Session ungültig oder nicht aktiv!")
        res.status(404).json({ message: "Session ungültig oder nicht aktiv!" })
        return;
    }

    const registrationNumber = activeUsers.get(credentialOffer.sessionId)
    if (!registrationNumber) {
        console.log("Benutzer nicht gefunden!")
        res.status(404).json({ message: "Benutzer nicht gefunden!" });
        return;
    }

    const credential = await issueCredential(walletDid, credentialOffer.schemaType, registrationNumber);
    if (credential.error) {
        console.log(credential.error)
        removeOffer(credentialOffer)
        res.status(400).json({ error: credential.error })
    } else {
        removeOffer(credentialOffer)
        res.status(200).json({ credential })
    }
}

export function declineOffer(req: Request, res: Response) {
    const { offerId } = req.body;
    const credentialOffer = pendingOffers.get(offerId)
    if (!credentialOffer) {
        res.status(404).json({ message: "Offer nicht gefunden" });
        return;
    }
    removeOffer(credentialOffer)
    res.status(200).json({ message: "Offer abgelehnt" });
}

async function checkIfIssuerRegistered(): Promise<boolean> {
    try {
        const response = await fetch(`${VDR_URL}/check-identifier/${encodeURIComponent(ISSUER_UUID)}`, {
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

    if (fs.existsSync(PUBLIC_KEY_PATH)) {
        publicJWK = JSON.parse(fs.readFileSync(PUBLIC_KEY_PATH, "utf8"));
    } else {
        console.log("Es existiert noch kein Public Key. Generiere neuen Schlüssel...");
        const { privateKey, publicKey } = await generateKeyPair("RS256", { extractable: true });

        const privateJWK = await exportJWK(privateKey);
        fs.writeFileSync(PRIVATE_KEY_PATH, JSON.stringify(privateJWK, null, 2));

        publicJWK = await exportJWK(publicKey);
        fs.writeFileSync(PUBLIC_KEY_PATH, JSON.stringify(publicJWK, null, 2));

        console.log("Neues Schlüsselpaar gespeichert.");
    }

    await registerIssuer(publicJWK);
}


async function createSchema(schemaDefinition: object): Promise<string> {
    const schemaHash = generateSchemaHash(schemaDefinition)

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

    await registerSchema(schema);
    return schemaId
}

function generateSchemaHash(schema: object): string {
    return crypto.createHash("sha256").update(JSON.stringify(schema)).digest("hex");
}

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

function removeOffer(offer: CredentialOffer) {
    const dashBoardSocket = activeSessions.get(offer.sessionId);
    if (dashBoardSocket) {
        console.log("Nachricht an Websocket: ", offer.sessionId)
        dashBoardSocket.send(JSON.stringify({ type: "offer-deleted", offer: offer.offerId }));
    }
    pendingOffers.delete(offer.offerId)
}

async function issueCredential(walletDid: string, schemaType: string, registrationNumber: number) {
    console.log("Anfrage zur Ausstellung von: ")

    try {
        if (!walletDid || !schemaType) {
            return { message: "Wallet DID und Schema Typ erforderlich!" };
        }

        const userResponse = await fetch(`${VDR_URL}/check-identifier/${walletDid}`, {
            method: "GET",
            headers: {
              "ngrok-skip-browser-warning": "true",
              "Content-Type": "application/json",
            },
          });

        if (!userResponse.ok) {
            return { error: "Benutzer-Identifier nicht gefunden" };
        }

        const schemaId = supportedSchemas.get(schemaType);
        if (!schemaId) {
            return { message: "Schema nicht gefunden!"};
        }

        const schemaResponse = await fetch(`${VDR_URL}/schema/${schemaId}`, {
            method: "GET",
            headers: {
              "ngrok-skip-browser-warning": "true",
              "Content-Type": "application/json",
            },
          });

        if (!schemaResponse.ok) {
            return { error: "Schema nicht gefunden" };
        }
        const schemaData = await schemaResponse.json();
        console.log("Schemadaten: ", schemaData)

        const db = await openDB();
        if (!db) {
            console.error("❌ Fehler: Datenbankverbindung fehlgeschlagen!");
            return { error: "Datenbankverbindung fehlgeschlagen!" };
        }
        console.log("✅ Datenbankverbindung erfolgreich!");

        const student = await db.get("SELECT * FROM students WHERE registration_number = ?", [registrationNumber])

        if(!student) {
            return { error: "Student nicht gefunden!" }
        }

        const data = await getStudentDataForSchema(registrationNumber, schemaType, db)
        if (!data) {
            return { error: "Fehler beim Laden der Studentendaten!" }
        }

        const { issuanceDate, expiryDate } = getSemesterValidityDates()
        const universitySemester = calculateUniversitySemester(data.enrollment_date)
  
        let credentialSubject;
        schemaType === "EnrollmentCredential" ?
        credentialSubject = {
            ...data,
            birth_date: formatDate(new Date(data.birth_date)),
            enrollment_date: formatDate(new Date(data.enrollment_date)),
            id: walletDid,
            university_semester: universitySemester,
            issuance_date: formatDate(issuanceDate),
            expiry_date: formatDate(expiryDate)
        } : credentialSubject = {
            ...data,
            birth_date: formatDate(new Date(data.birth_date)),
            enrollment_date: formatDate(new Date(data.enrollment_date)),
            id: walletDid,
            total_semesters: universitySemester,
            issuance_date: formatDate(issuanceDate),
            exmatriculation_date: formatDate(expiryDate)
        } ;

        console.log("CredentialSubject:", credentialSubject)

        if (!validateSchema(credentialSubject, schemaData.schema)) {
            return { error: "Daten entsprechen nicht dem Schema"};
        }

        const credential = {
            id: uuidv4(),
            type: [ "VerifiableCredential", schemaType],
            issuer: `/identifier/${ISSUER_UUID}`,
            issuanceDate: new Date().toISOString(),
            credentialSubject: credentialSubject,
            credentialSchema: {
                id: `/schema/${schemaId}`,
            }
        };

        const signedCredential = await signCredential(credential)
        if(!signedCredential) {
            return { error: "Fehler beim Signieren des Credentials"}
        } 

        return signedCredential

    } catch (err) {
        console.error("Fehler bei der Credential-Erstellung:", err);
        return { error: "Fehler bei der Credential-Ausstellung" };
    }
}

async function signCredential(credential: any): Promise<any> {
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
        return null;
    }
    const privateKeyJWK = JSON.parse(fs.readFileSync(PRIVATE_KEY_PATH, "utf8"));
    const proof = {
        type: "JsonWebSignature2020",
        created: new Date().toISOString(),
        proofPurpose: "assertionMethod",
        verificationMethod: `/identifier/${ISSUER_UUID}`,
        jws: await new SignJWT(credential)
        .setProtectedHeader({ alg: "RS256" })
        .sign(await importJWK(privateKeyJWK, "RS256"))
    }

    const signedCredential = {
        ...credential,
        proof: proof
    }

    return { signedCredential };
}

function formatDate(date: Date): string {
    return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    })
}

async function getStudentDataForSchema(registrationNumber: number, schemaType: string, db: any) {
    if (!schemaType) return null;

    const schema = supportedCredentials[schemaType];
    console.log("Schemadaten:", schema);

    const computedFields = schemaType === "EnrollmentCredential" ? new Set(["id", "issuance_date", "expiry_date", "university_semester"]) : new Set(["id", "total_semesters", "exmatriculation_date", "issuance_date"]);

    const dbFields = Object.keys(schema).filter(field => !computedFields.has(field));
    console.log("Felder aus DB:", dbFields);

    if (dbFields.length === 0) {
        return null;
    }

    const query = `SELECT ${dbFields.join(", ")} FROM students WHERE registration_number = ?`;

    console.log("🚀 Starte Datenbankabfrage...");
    const studentData = await db.get(query, [registrationNumber]);
    console.log("✅ Student gefunden:", studentData);


    if (!studentData) return null;

    return studentData;
}


function getSemesterValidityDates() {
    const today = new Date();
    const year = today.getFullYear();
  
    let issuanceDate, expiryDate;
  
    if (today.getMonth() >= 9) {
        issuanceDate = new Date(year, 9, 1);
        expiryDate = new Date(year + 1, 2, 31);
    } else if (today.getMonth() < 3) {
        issuanceDate = new Date(year - 1, 9, 1);
        expiryDate = new Date(year, 2, 31)
    } else {
        issuanceDate = new Date(year, 3, 1);
        expiryDate = new Date(year, 8, 30);
    }
  
    return {
      issuanceDate: issuanceDate,
      expiryDate: expiryDate
    };
}

function calculateUniversitySemester(enrollmentDate: string): number {

    const enrollment = new Date(enrollmentDate)

    const today = new Date();

    if (enrollment > today) {
        console.error("❌ Fehler: Einschreibedatum liegt in der Zukunft!", enrollmentDate);
        return 0;
    }

    let semesterCount = 0;
    let currentSemesterStart = enrollment;
    let nextSemesterStart: Date = currentSemesterStart.getMonth() < 3 ? new Date(Date.UTC(currentSemesterStart.getFullYear(), 9, 1)) : new Date(Date.UTC(currentSemesterStart.getFullYear() + 1, 3, 1));
    while (currentSemesterStart < today) {
        semesterCount++;
        currentSemesterStart = new Date(nextSemesterStart);
        if (currentSemesterStart.getMonth() < 4) {
            nextSemesterStart = new Date(Date.UTC(currentSemesterStart.getFullYear(), 9, 1));
        } else {
            nextSemesterStart = new Date(Date.UTC(currentSemesterStart.getFullYear() + 1, 3, 1));
        }
    }

    return semesterCount;
}


  
  
