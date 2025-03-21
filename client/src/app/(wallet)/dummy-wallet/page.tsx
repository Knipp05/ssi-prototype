"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { BACKEND_URL, FRONTEND_URL, PORT, VDR_URL } from "../../constants";
import { CredentialOffer, PresentationRequest, TempVP, VC } from "../../types";
import Credential from "./Credential";
import Link from "next/link";
import { Suspense } from "react";

const STORAGE_KEY = "dummyWalletIdentifier";
const CREDENTIALS_STORAGE_KEY = "dummyWalletCredentials";

export default function DummyWalletWrapper() {
  return (
    <Suspense fallback={<div>Laden ...</div>}>
      <DummyWallet />
    </Suspense>
  );
}

function DummyWallet() {
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(
    searchParams.get("sessionId")
  );
  const [identifier, setIdentifier] = useState<string>("");
  const [credentialOffers, setCredentialOffers] = useState<CredentialOffer[]>(
    []
  );
  const [presentationRequests, setPresentationRequests] = useState<
    PresentationRequest[]
  >([]);
  const [activePresentationRequest, setActivePresentationRequest] =
    useState<PresentationRequest | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [credentials, setCredentials] = useState<VC<Record<string, any>>[]>([]);
  const [isCryptoSupported, setIsCryptoSupported] = useState(true);

  // **Prüft, ob ein Identifier existiert oder erzeugt einen neuen**
  useEffect(() => {
    async function checkOrCreateIdentifier() {
      if (!window.crypto?.subtle) {
        setIsCryptoSupported(false);
        return;
      }

      const storedId = localStorage.getItem(STORAGE_KEY);

      if (storedId && localStorage.getItem("dummyWalletPrivateKey")) {
        const storedData = JSON.parse(storedId);
        console.log("Identifier und Schlüsselpaar existieren bereits!");
        console.log("✅ Identifier gefunden:", storedData.id);
        setIdentifier(storedData.id);
        await registerUserWithVDR(storedData.id, storedData.publicKey);
        return;
      }

      console.log("🔹 Kein Identifier gefunden, erzeuge neuen...");
      const { userId, publicJWK } = await createUserIdentifier();

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ id: userId, publicKey: publicJWK })
      );
      setIdentifier(userId);

      await registerUserWithVDR(userId, publicJWK);
    }

    checkOrCreateIdentifier();
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const wsInstance = new WebSocket(BACKEND_URL.replace(/^http/, "ws")); // ggf. dynamischer gestalten

    wsInstance.onopen = () => {
      console.log("Wallet WebSocket verbunden!");
      wsInstance.send(JSON.stringify({ type: "register-wallet", sessionId }));
    };

    wsInstance.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "credential-offer") {
        console.log("Neues Credential Offer erhalten:", message);
        setCredentialOffers((oldCredentialOffers) => [
          ...oldCredentialOffers,
          message.offer,
        ]);
      }
      if (message.type === "presentation-request") {
        console.log("Neue Anfrage für Presentation erhalten:", message);
        setPresentationRequests((oldPresentationRequests) => [
          ...oldPresentationRequests,
          message.request,
        ]);
      }
      if (message.type === "register-error") {
        setSessionId(null);
      }
    };

    return () => {
      wsInstance.close();
    };
  }, [sessionId]);

  // **Lädt alle gespeicherten Credentials aus localStorage**
  useEffect(() => {
    const storedCredentials = JSON.parse(
      localStorage.getItem(CREDENTIALS_STORAGE_KEY) || "[]"
    );
    setCredentials(storedCredentials);
  }, []);

  async function createUserIdentifier() {
    const userId = `did:example:${uuidv4()}`;
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );

    const privateKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey
    );
    const publicKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey
    );

    localStorage.setItem("dummyWalletPrivateKey", JSON.stringify(privateKey));

    return { userId, publicJWK: publicKey };
  }

  async function acceptCredentialOffer(offer: CredentialOffer) {
    console.log("Angebot akzeptiert. Anfrage an Backend...");

    const response = await fetch(`${BACKEND_URL}/accept-offer`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        holderId: identifier,
        offerId: offer.offerId,
      }),
    });

    if (!response.ok) {
      alert("❌ Fehler bei der Ausstellung des Credentials");
      return;
    }

    const result = await response.json();
    console.log("✅ Credential erhalten: ", result.credential.signedCredential);

    const newCredential = result.credential.signedCredential;

    // **Bestehende Credentials aus localStorage laden**
    const storedCredentials = JSON.parse(
      localStorage.getItem("dummyWalletCredentials") || "[]"
    );

    // **Neues Credential hinzufügen**
    const updatedCredentials = [...storedCredentials, newCredential];

    // **Speichern im localStorage**
    localStorage.setItem(
      "dummyWalletCredentials",
      JSON.stringify(updatedCredentials)
    );

    // **State aktualisieren**
    setCredentials(updatedCredentials);
    setCredentialOffers((oldCredentialOffers) =>
      oldCredentialOffers.filter(
        (offerElement) => offerElement.offerId !== offer.offerId
      )
    );
  }

  async function declineCredentialOffer(offer: CredentialOffer) {
    const response = await fetch(`${BACKEND_URL}/decline-offer`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        offerId: offer.offerId,
      }),
    });
    if (!response.ok) {
      console.log("Fehler beim Ablehnen des Credentials");
    }
    console.log("Angebot abgelehnt.");
    setCredentialOffers((oldCredentialOffers) =>
      oldCredentialOffers.filter(
        (offerElement) => offerElement.offerId !== offer.offerId
      )
    );
  }

  async function declinePresentationRequest(request: PresentationRequest) {
    const response = await fetch(`${BACKEND_URL}/decline-request`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: request.requestId,
      }),
    });
    if (!response.ok) {
      console.log("Fehler beim Ablehnen der Anfrage");
    }
    console.log("Anfrage abgelehnt.");
    setPresentationRequests((oldPresentationRequests) =>
      oldPresentationRequests.filter(
        (requestElement) => requestElement.requestId !== request.requestId
      )
    );
    setActivePresentationRequest(null);
  }

  async function createVerifiablePresentation<T>(credential: VC<T>) {
    if (
      activePresentationRequest?.requiredSchemaTypes[1] !== credential.type[1]
    )
      return;
    if (!identifier) {
      alert("❌ Kein Identifier gefunden.");
      return;
    }

    const privateKeyJWK = JSON.parse(
      localStorage.getItem("dummyWalletPrivateKey") || "{}"
    );

    if (!privateKeyJWK.kty) {
      alert("❌ Privater Schlüssel nicht gefunden!");
      return;
    }

    const vp = {
      type: "VerifiablePresentation",
      verifiableCredential: [credential],
    };

    const signedVP = await signVP(vp, privateKeyJWK);

    const response = await fetch(`${BACKEND_URL}/verify-credential`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId: sessionId, vp: signedVP }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      alert(responseData.message);
    } else {
      alert("✔️ Verifikation erfolgreich!");
      setPresentationRequests((oldPresentationRequests) =>
        oldPresentationRequests.filter(
          (requestElement) =>
            requestElement.requestId !== activePresentationRequest?.requestId
        )
      );
      setActivePresentationRequest(
        presentationRequests.length > 0 ? presentationRequests[0] : null
      );
    }
  }

  async function signVP<T>(vp: TempVP<T>, privateKeyJWK: object) {
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const payload = vp;
    const encoder = new TextEncoder();

    // Base64URL-encode Header und Payload
    const encodedHeader = btoa(JSON.stringify(header))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const encodedPayload = btoa(JSON.stringify(payload))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    // Private Key importieren
    const key = await window.crypto.subtle.importKey(
      "jwk",
      privateKeyJWK,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // Signatur erzeugen
    const signature = await window.crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );

    // Base64URL der Signatur erzeugen
    const jwsSignature = Buffer.from(new Uint8Array(signature))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    // **Korrektes Compact JWS zurückgeben**
    const jws = `${encodedHeader}.${encodedPayload}.${jwsSignature}`;
    const proof = {
      type: "RsaSignature2018",
      created: new Date().toISOString(),
      proofPurpose: "authentication",
      verificationMethod: `/issuer/${identifier}`,
      jws: jws,
    };

    return {
      ...vp,
      proof,
    };
  }

  async function registerUserWithVDR(userId: string, publicKey: object) {
    try {
      const checkResponse = await fetch(`${VDR_URL}/issuer/${userId}`, {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Content-Type": "application/json",
        },
      });

      if (checkResponse.ok) {
        console.log(`✅ Benutzer ${userId} ist bereits im VDR registriert.`);
        return;
      }

      console.log(
        `🔍 Benutzer ${userId} ist nicht registriert. Registrierung...`
      );

      const registerResponse = await fetch(`${VDR_URL}/register-identifier`, {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: userId, publicKey }),
      });

      const registerData = await registerResponse.json();

      if (!registerData.error) {
        console.log(
          "✅ Benutzer erfolgreich im Dummy VDR registriert:",
          userId
        );
      } else {
        console.log(
          "❌ Fehler bei der Benutzerregistrierung:",
          registerData.error
        );
      }
    } catch (error) {
      console.log("❌ Fehler bei der VDR-Kommunikation:", error);
    }
  }

  function clearData(deletedElement: string) {
    if (deletedElement === "identifier") {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("dummyWalletPrivateKey");
      setIdentifier("");
    } else if (deletedElement === "credentials") {
      localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
      setCredentials([]);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg border">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
        Dummy Wallet
      </h1>
      {!isCryptoSupported && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md">
          <p className="font-semibold">
            ❌ WebCrypto API wird nicht unterstützt!
          </p>
          <p>
            Diese Wallet kann nur via{" "}
            <strong>
              <u>
                <Link href={`http://localhost:${PORT}/dummy-wallet`}>
                  localhost
                </Link>
              </u>
            </strong>{" "}
            oder über{" "}
            <strong>
              <u>
                <Link href={`${FRONTEND_URL}/dummy-wallet`}>https</Link>
              </u>
            </strong>{" "}
            geöffnet werden. Ansonsten ist die WebCrypto API deaktiviert. Öffne
            die Wallet daher nur auf demselben Gerät wie die restliche Anwendung
            oder nutze ngrok, um einen https Tunnel zu erstellen.
          </p>
        </div>
      )}
      {!sessionId && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md shadow-md">
          <p className="font-semibold">⚠ Keine gültige Session gefunden!</p>
          <p>
            Möglicherweise funktioniert das Empfangen und Senden von Credentials
            nicht richtig. Öffne die Wallet aus einer gültigen Session heraus (
            <span className="font-semibold">QR Code oder Link</span>), um sie
            vollständig nutzen zu können.
          </p>
        </div>
      )}

      {/* 📢 Credential Offer Benachrichtigung */}
      {credentialOffers?.map((offer) => (
        <div
          key={offer.offerId}
          className="p-4 mb-4 border border-yellow-500 bg-yellow-100 text-yellow-900 rounded-lg shadow-md"
        >
          <p className="font-semibold">📜 Neues Credential Angebot!</p>
          <p>
            <strong>Credential:</strong> {offer.schemaType}
          </p>
          <p>
            <strong>Aussteller:</strong> {offer.issuerId}
          </p>
          <div className="mt-3 flex gap-4">
            <button
              onClick={() => acceptCredentialOffer(offer)}
              className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition"
            >
              ✅ Annehmen
            </button>
            <button
              onClick={() => declineCredentialOffer(offer)}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition"
            >
              ❌ Ablehnen
            </button>
          </div>
        </div>
      ))}
      {/* 📢 Credential Offer Benachrichtigung */}
      {presentationRequests?.map((presentation) => (
        <div
          key={presentation.requestId}
          className="p-4 mb-4 border border-yellow-500 bg-yellow-100 text-yellow-900 rounded-lg shadow-md"
        >
          <p className="font-semibold">📜 Neue Anfrage für Präsentation!</p>
          <p>
            <strong>Nachweistyp:</strong> {presentation.requiredSchemaTypes[1]}
          </p>
          <p>
            {/* <strong>Aussteller:</strong> {presentation.} // hier später Namen des Anfragers */}
          </p>
          <div className="mt-3 flex gap-4">
            {activePresentationRequest ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span>Warten auf Auswahl...</span>
              </div>
            ) : (
              <button
                onClick={() => setActivePresentationRequest(presentation)}
                className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition"
              >
                ✅ Credential auswählen
              </button>
            )}
            <button
              onClick={() => declinePresentationRequest(presentation)}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition"
            >
              ❌ Ablehnen
            </button>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between mb-4 p-4 bg-gray-100 rounded-lg shadow-md">
        <p className="text-lg font-medium">
          <strong>Identifier:</strong>{" "}
          <span className="text-blue-600">
            {identifier || "-- kein Identifier registriert --"}
          </span>
        </p>
        {identifier === "" && (
          <button
            onClick={async () => {
              const identifierData = await createUserIdentifier();
              if (!identifierData) {
                return;
              }
              const { userId, publicJWK } = identifierData;

              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ id: userId, publicKey: publicJWK })
              );
              setIdentifier(userId);

              await registerUserWithVDR(userId, publicJWK);
            }}
            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:bg-blue-600 hover:scale-105 active:scale-95"
          >
            ➕ Neuen Identifier registrieren
          </button>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-3">📜 Meine Credentials</h2>

      {activePresentationRequest && presentationRequests.length > 0 ? (
        credentials.length === 0 ? (
          <p className="text-gray-500">Keine Credentials gespeichert.</p>
        ) : (
          credentials.map((cred) => (
            <div
              key={cred.id}
              onClick={() => createVerifiablePresentation(cred)}
              className={`${
                activePresentationRequest.requiredSchemaTypes[1] ===
                cred.type[1]
                  ? "cursor-pointer border-yellow-500 bg-yellow-100 text-yellow-900 hover:scale-105 hover:shadow-lg"
                  : "cursor-not-allowed opacity-50"
              }`}
            >
              <Credential credential={cred} />{" "}
              {/* Hier unbeding dynamische Darstellung der Credential Daten machen!!!! */}
            </div>
          ))
        )
      ) : credentials.length === 0 ? (
        <p className="text-gray-500">Keine Credentials gespeichert.</p>
      ) : (
        <ul className="space-y-4">
          {credentials.map((cred) => (
            <Credential key={cred.id} credential={cred} />
          ))}
        </ul>
      )}

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => clearData("identifier")}
          className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
        >
          🗑 Identifier löschen
        </button>
        <button
          onClick={() => clearData("credentials")}
          className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
        >
          🗑 Credentials löschen
        </button>
      </div>
    </div>
  );
}
