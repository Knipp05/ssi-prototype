import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { JWT_SECRET, VDR_URL } from "./constants.js"
import { openDB } from "./database.js";
import { compare } from "bcrypt-ts";
import { issueJWT, validateSchema } from "./issuer.js";
import { importJWK, jwtVerify } from "jose";
import { activeSessions } from "./index.js";

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Zugriff verweigert. Kein Token vorhanden." });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        (req as any).user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ message: "Ungültiges Token" })
        return;
    }
}

export async function verifyPresentation (req: Request, res: Response) {
    try {
        const { sessionId, vp } = req.body;
        if (!sessionId || !vp) {
            res.status(400).json({ message: "Session ID oder VP fehlt!" })
            return;
        }

        console.log("VP erhalten: ", vp)

        const holderId = vp.verifiableCredential[0].credentialSubject.id;
        const holderResponse = await fetch(`${VDR_URL}/issuer/${holderId}`, {
            headers: { "ngrok-skip-browser-warning": "true"},
        });
        if (!holderResponse.ok) {
            res.status(404).json({ message: "Holder Identifier nicht gefunden!" });
            return;
        }

        const holderData = await holderResponse.json();
        const holderPublicKey = await importJWK(holderData.publicKey, "RS256");

        try {
            await jwtVerify(vp.proof.jws, holderPublicKey);
            console.log("VP-Signatur des Holders ist gültig!");
        } catch (error) {
            console.error("Ungültige VP-Signatur des Holder: ", error);
            res.status(400).json({ message: "VP-Signatur des Holders ungültig!" });
            return;
        }

        const issuerId = vp.verifiableCredential[0].issuer;
        const issuerResponse = await fetch(`${VDR_URL}${issuerId}`, {
            headers: { "ngrok-skip-browser-warning": "true" },
        });
        if (!issuerResponse.ok) {
            res.status(404).json({ message: "Issuer Identifier nicht gefunden!" });
        }

        const issuerData = await issuerResponse.json()
        const issuerPublicKey = await importJWK(issuerData.publicKey, "RS256");
        const vc = vp.verifiableCredential[0];

        try {
            await jwtVerify(vc.proof.jws, issuerPublicKey);
            console.log("VC-Signatur des Issuers ist gültig!");
        } catch (error) {
            console.error("Ungültige VC-Signatur des Issuers: ", error)
            res.status(400).json({ message: "VC-Signatur des Issuers ungültig!" });
            return;
        }

        const schemaId = vc.credentialSchema.id;
        const schemaResponse = await fetch(`${VDR_URL}${schemaId}`, {
            headers: { "ngrok-skip-browser-warning": "true" },
        });

        if (!schemaResponse.ok) {
            res.status(404).json({ message: "Schema nicht gefunden" })
            return;
        }

        const schemaData = await schemaResponse.json();

        if (!validateSchema(vc.credentialSubject, schemaData.schema)) {
            res.status(400).json({ message: "Daten entsprechen nicht dem Schema!" })
            return;
        }

        console.log("Credential Schema erfolgreich validiert!")

        // Hier weitere Prüfung!

        console.log("Alle Verifizierungschecks bestanden")

        const userId = vp.verifiableCredential[0].credentialSubject.id;
        const token = issueJWT(userId)

        if (activeSessions.has(sessionId)) {
            const ws = activeSessions.get(sessionId);
            ws?.send(JSON.stringify({ type: "verification-success", jwt: token }))
            console.log(`Erfolg an Session ${sessionId} gesendet!`);
        } else {
            console.warn("Keine aktive WebSocket-Verbindung für diese Session ID gefunden!");
        }

        res.status(200).json({ message: "Verifizierung erfolgreich!" })
        return;
    } catch (error) {
        console.error("Fehler bei der Verifizierung: ", error)
        res.status(500).json({ message: "Interner Serverfehler" })
        return;
    }
}

export async function loginUser(req: Request, res: Response) {
    const { username, password } = req.body;

    try {
        const db = await openDB();
        const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);

        if (!user || !(await compare(password, user.password))) {
            res.status(401).json({ message: "Ungültige Anmeldedaten" });
            return;
        }

        const token = issueJWT(user.id)
        res.status(200).json({ jwt: token })
        return;
    } catch (error) {
        res.status(500).json({ message: "Fehler beim Login" });
    }
}