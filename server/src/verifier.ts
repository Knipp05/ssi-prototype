import { Request, Response } from "express"
import jwt from "jsonwebtoken"
import { JWT_SECRET, VDR_URL } from "./constants.js"
import { openDB } from "./database.js";
import { v4 as uuidv4 } from "uuid"
import { compare } from "bcrypt-ts";
import { issueJWT } from "./issuer.js";
import { compactVerify, importJWK, jwtVerify } from "jose";
import { activeSessions, activeUsers, pendingRequests } from "./index.js";
import { PresentationRequest } from "./types.js";

export function authenticateJWT(req: Request, res: Response) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Zugriff verweigert. Kein Token vorhanden." });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        res.status(200).json({ isValid: true });
        return;
    } catch (error) {
        res.status(403).json({ message: "Ungültiges Token" })
        return;
    }
}

export async function verifyPresentation (req: Request, res: Response) {
    const { requestId, presentation } = req.body;
    if (!requestId || !presentation) {
        res.status(400).json({ message: "Session ID oder VP fehlt!" })
        return;
    }

    console.log("VP erhalten: ", presentation)

    const request = pendingRequests.get(requestId)
    if (!request) {
        res.status(404).json({ message: "Request nicht gefunden!"})
        return;
    }

    const walletDid = presentation.verifiableCredential[0].credentialSubject.id;
    const holderResponse = await fetch(`${VDR_URL}/identifier/${walletDid}`, {
        headers: { "ngrok-skip-browser-warning": "true"},
    });
    if (!holderResponse.ok) {
        res.status(404).json({ message: "Wallet DID nicht gefunden!" });
        return;
    }

    const holderData = await holderResponse.json();
    const holderPublicKey = await importJWK(holderData.publicKey, "RS256");

    try {
        await jwtVerify(presentation.proof.jws, holderPublicKey);
        console.log("VP-Signatur des Holders ist gültig!");
    } catch (error) {
        console.error("Ungültige VP-Signatur des Holder: ", error);
        res.status(400).json({ message: "VP-Signatur des Holders ungültig!" });
        return;
    }

    const issuerDid = presentation.verifiableCredential[0].issuer;
    const issuerResponse = await fetch(`${VDR_URL}${issuerDid}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (!issuerResponse.ok) {
        res.status(404).json({ message: "Issuer Identifier nicht gefunden!" });
    }

    const issuerData = await issuerResponse.json()
    const issuerPublicKey = await importJWK(issuerData.publicKey, "RS256");
    const credential = presentation.verifiableCredential[0];

    if (!await verifyCredentialSignature(credential, issuerPublicKey)) {
        console.error("Ungültige VC-Signatur!");
        res.status(400).json({ message: "VC-Signatur ungültig!"});
        return;
    }

    const schemaId = credential.credentialSchema.id;
    const schemaResponse = await fetch(`${VDR_URL}${schemaId}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
    });

    if (!schemaResponse.ok) {
         res.status(404).json({ message: "Schema nicht gefunden" })
        return;
    }

    const schemaData = await schemaResponse.json();

    if (!validateSchema(credential.credentialSubject, schemaData.schema)) {
        res.status(400).json({ message: "Daten entsprechen nicht dem Schema!" })
        return;
    }

    console.log("Credential Schema erfolgreich validiert!")

    // Hier weitere Prüfung möglich...

    console.log("Alle Verifizierungschecks bestanden")

    const userId = presentation.verifiableCredential[0].credentialSubject.id;
    const token = issueJWT(userId)

    const db = await openDB();
    if (!db) {
        console.error("❌ Fehler: Datenbankverbindung fehlgeschlagen!");
        res.status(400).json({ message: "Fehler beim Öffnen der Datenbank!" })
        return;
    }
    console.log("✅ Datenbankverbindung erfolgreich!");

    const studentName = await db.get("SELECT username FROM studentLogin WHERE registration_number = ?", [presentation.verifiableCredential[0].credentialSubject.registration_number])

    if(!studentName) {
        res.status(404).json({ message: "Student nicht gefunden!" })
        return;
    }

    if (activeSessions.has(request.sessionId)) {
        const ws = activeSessions.get(request.sessionId);
        ws?.send(JSON.stringify({ type: "verification-success", jwt: token, user: studentName.username}))
        console.log(`Erfolg an Session ${request.sessionId} gesendet!`);
        pendingRequests.delete(request.requestId)
    } else {
        console.warn("Keine aktive WebSocket-Verbindung für diese Session ID gefunden!");
        pendingRequests.delete(request.requestId)
    }

    res.status(200).json({ message: "Verifizierung erfolgreich!" })
    return;
}

async function verifyCredentialSignature(credential: any, publicKey: CryptoKey | Uint8Array<ArrayBufferLike>): Promise<boolean> {
    try {
        const { payload } = await compactVerify(credential.proof.jws, publicKey);
        const decodedPayload = JSON.parse(new TextDecoder().decode(payload));

        const { proof, ...credentialPayload } = credential;
        const credentialCanonical = JSON.stringify(credentialPayload);

        if (JSON.stringify(decodedPayload) === credentialCanonical) {
            return true
        } else {
            return false
        }
    } catch(error) {
        console.log(error)
        return false
    }
}

export function declineRequest(req: Request, res: Response) {
    const { requestId } = req.body;
    const presentationRequest = pendingRequests.get(requestId)
    console.log("Request: ", presentationRequest?.requestId)
    if (!presentationRequest) {
        res.status(404).json({ message: "Anfrage nicht gefunden" });
        return;
    }
    removeRequest(presentationRequest)
    res.status(200).json({ message: "Anfrage abgelehnt" });
}

export async function loginUser(req: Request, res: Response) {
    const { username, password, sessionId } = req.body;

    try {
        const db = await openDB();
        const user = await db.get("SELECT * FROM studentLogin WHERE username = ?", [username]);

        if (!user || !(await compare(password, user.password))) {
            res.status(401).json({ message: "Ungültige Anmeldedaten" });
            return;
        }

        const token = issueJWT(user.registration_number)
        activeUsers.set(sessionId, user.registration_number)
        res.status(200).json({ jwt: token, username })
        return;
    } catch (error) {
        res.status(500).json({ message: "Fehler beim Login" });
    }
}

export async function requestPresentation(req: Request, res: Response) {
    const { sessionId } = req.body;

    if (!sessionId) {
        res.status(400).json({ message: "SessionID und Schema Typ erforderlich!" });
        return;
    }

    const requestId = uuidv4();

    const request: PresentationRequest = {
        sessionId,
        requestId,
        requiredSchemaTypes: ["VerifiableCredential", "EnrollmentCredential"]
    }

    pendingRequests.set(requestId, request)

    res.status(201).json({ message: "Request wurde erstellt!"});
}

export function validateSchema(data: object, schema: any): boolean {
    console.log("Eingehende Daten:", data);
    console.log("Erwartetes Schema:", schema);

    for (const key of Object.keys(schema)) {
        console.log(`Prüfe, ob ${key} in den Daten vorhanden ist`);

        if (!(key in data)) {
            console.error(`Fehlendes Feld: ${key}`);
            return false;
        }

        const expectedType = schema[key].type;
        const actualValue = (data as Record<string, any>)[key];
        const actualType = typeof actualValue;

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

function removeRequest(request: PresentationRequest) {
    console.log(request.sessionId)
    const dashBoardSocket = activeSessions.get(request.sessionId);
    if (dashBoardSocket) {
        console.log("Nachricht an Websocket: ", request.sessionId)
        dashBoardSocket.send(JSON.stringify({ type: "request-deleted", requestId: request.requestId }));
    }
    pendingRequests.delete(request.requestId)
}