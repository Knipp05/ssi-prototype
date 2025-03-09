/* import { sendVerificationResult } from "./websocket.js";
import { importJWK, jwtVerify } from "jose";
import { openDB } from "./database.js";
import { validateSchema } from "./issuer.js";

export async function verifyCredential(sessionId: string, credential: any) {
    try {
        console.log("🔹 Prüfe Credential für Session:", sessionId);

        // 1️⃣ Public Key des Benutzers aus Dummy-VDR abrufen
        const userResponse = await fetch(
            `http://localhost:3002/get-public-key/${credential.credentialData.holder}`
        );
        const userData = await userResponse.json();

        if (!userData.success) {
            console.error("❌ Benutzer-Identifier nicht gefunden.");
            sendVerificationResult(sessionId, false);
            return false;
        }

        // 2️⃣ Public Key importieren
        const publicKey = await importJWK(userData.publicKey, "RS256");

        // 3️⃣ Credential-Signatur verifizieren
        const { payload } = await jwtVerify(credential.proof, publicKey);

        console.log("✅ Signatur gültig, Daten:", payload);

        // 4️⃣ Schema-Validierung
        const schemaResponse = await fetch(
            `http://localhost:3002/get-schema/${credential.credentialData.schema}`
        );
        const schemaData = await schemaResponse.json();

        if (!schemaData.success) {
            console.error("❌ Schema nicht gefunden.");
            sendVerificationResult(sessionId, false);
            return false;
        }

        // 5️⃣ Prüfen, ob die Credential-Daten dem Schema entsprechen
        if (!validateSchema(credential.credentialData.demoData, schemaData.schema)) {
            console.error("❌ Credential entspricht nicht dem Schema.");
            sendVerificationResult(sessionId, false);
            return false;
        }

        // ✅ Verifikation erfolgreich
        console.log("✅ Credential erfolgreich verifiziert!");
        sendVerificationResult(sessionId, true);
        return true;
    } catch (err) {
        console.error("❌ Fehler bei der Verifikation:", err);
        sendVerificationResult(sessionId, false);
        return false;
    }
}
 */