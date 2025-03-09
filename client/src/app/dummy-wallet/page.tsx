"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { BACKEND_URL, VDR_URL } from "../constants";

const STORAGE_KEY = "dummyWalletIdentifier";
const CREDENTIALS_STORAGE_KEY = "dummyWalletCredentials";

export default function DummyWallet() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [identifier, setIdentifier] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [publicKey, setPublicKey] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [credentials, setCredentials] = useState<any[]>([]); // Array für Credentials

  // **Prüft, ob ein Identifier existiert oder erzeugt einen neuen**
  useEffect(() => {
    async function checkOrCreateIdentifier() {
      const storedId = localStorage.getItem(STORAGE_KEY);
      const identifierData = await createUserIdentifier();

      if (!identifierData) {
        alert("WebCrypto API funktioniert nur unter localhost oder https!");
        return;
      }

      if (!storedId) {
        console.log("🔹 Kein Identifier gefunden, erzeuge neuen...");
        const { userId, publicJWK } = identifierData;

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ id: userId, publicKey: publicJWK })
        );
        setIdentifier(userId);
        setPublicKey(JSON.stringify(publicJWK, null, 2));

        await registerUserWithVDR(userId, publicJWK);
      } else {
        const storedData = JSON.parse(storedId);
        console.log("✅ Identifier gefunden:", storedData.id);
        setIdentifier(storedData.id);
        setPublicKey(JSON.stringify(storedData.publicKey, null, 2));
        await registerUserWithVDR(storedData.id, storedData.publicKey);
      }
    }

    checkOrCreateIdentifier();
  }, []);

  // **Lädt alle gespeicherten Credentials aus localStorage**
  useEffect(() => {
    const storedCredentials = JSON.parse(
      localStorage.getItem(CREDENTIALS_STORAGE_KEY) || "[]"
    );
    setCredentials(storedCredentials);
  }, []);

  async function createUserIdentifier() {
    if (!window.crypto?.subtle) {
      alert(
        "WebCrypto API wird derzeit nicht unterstützt. Bitte rufe die Seite über localhost oder https auf!"
      );
      return;
    }
    const userId = uuidv4();
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

  async function sendCredential(credential) {
    if (!sessionId) {
      alert("❌ Keine gültige Session-ID gefunden.");
      return;
    }

    const response = await fetch(`${BACKEND_URL}/verify-credential`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, credential }),
    });

    const result = await response.json();
    if (!result.success) {
      alert("❌ Fehler bei der Übertragung.");
    }
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

  async function requestCredential() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      alert("⚠ Kein Benutzer-Identifier gefunden. Bitte neu registrieren.");
      return;
    }

    const { id: userId } = JSON.parse(storedData);

    const response = await fetch(`${BACKEND_URL}/issue-credential`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ holderId: userId }),
    });

    const result = await response.json();
    if (!result.error) {
      console.log("✅ Credential erhalten:", result.credential);

      // **Speichere Credential in localStorage**
      const storedCredentials = JSON.parse(
        localStorage.getItem(CREDENTIALS_STORAGE_KEY) || "[]"
      );
      const updatedCredentials = [...storedCredentials, result.credential];

      localStorage.setItem(
        CREDENTIALS_STORAGE_KEY,
        JSON.stringify(updatedCredentials)
      );

      // **State aktualisieren**
      setCredentials(updatedCredentials);
    } else {
      alert("❌ Fehler bei der Ausstellung des Credentials.");
    }
  }

  function clearData() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    localStorage.removeItem("dummyWalletPrivateKey");
    setIdentifier("");
    setPublicKey(null);
    setCredentials([]);
    alert("🗑 Alle gespeicherten Daten wurden gelöscht.");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-lg border">
      <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
        Dummy Wallet
      </h1>

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
                alert(
                  "WebCrypto API funktioniert nur unter localhost oder https!"
                );
                return;
              }
              const { userId, publicJWK } = identifierData;

              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ id: userId, publicKey: publicJWK })
              );
              setIdentifier(userId);
              setPublicKey(JSON.stringify(publicJWK, null, 2));

              await registerUserWithVDR(userId, publicJWK);
            }}
            className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:bg-blue-600 hover:scale-105 active:scale-95"
          >
            ➕ Neuen Identifier registrieren
          </button>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-3">📜 Meine Credentials</h2>

      {credentials.length === 0 ? (
        <p className="text-gray-500">Keine Credentials gespeichert.</p>
      ) : (
        <ul className="space-y-4">
          {credentials.map((cred, index) => (
            <li
              key={index}
              className="border p-4 rounded-lg shadow-md bg-gray-50"
            >
              <p>
                <strong>ID:</strong> {cred.credential.id}
              </p>
              <p>
                <strong>Credential Schema:</strong>{" "}
                {cred.credential.credentialSchema.id}
              </p>
              <p>
                <strong>Type:</strong>{" "}
                {cred.credential.type.map((type: string) => (
                  <span
                    key={type}
                    className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm mr-1"
                  >
                    {type}
                  </span>
                ))}
              </p>
              <p>
                <strong>Issuer:</strong> {cred.credential.issuer}
              </p>
              <p>
                <strong>Issuance Date:</strong> {cred.credential.issuanceDate}
              </p>
              <p>
                <strong>Holder ID:</strong>{" "}
                {cred.credential.credentialSubject.id}
              </p>
              <p>
                <strong>Name:</strong> {cred.credential.credentialSubject.name}
              </p>
              <p>
                <strong>Alter:</strong> {cred.credential.credentialSubject.age}
              </p>
              <p>
                <strong>Reg.-Nr.:</strong>{" "}
                {cred.credential.credentialSubject.registration_number}
              </p>
              <p className="truncate">
                <strong>Proof:</strong>{" "}
                <span className="text-xs text-gray-600">{cred.proof}</span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex gap-4">
        <button
          onClick={clearData}
          className="px-4 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition"
        >
          🗑 Identifier & Daten löschen
        </button>
        <button
          onClick={requestCredential}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition"
        >
          📜 Test Credential anfordern
        </button>
      </div>
    </div>
  );
}
