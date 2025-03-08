"use client";
import { useEffect, useState } from "react";

const DUMMY_VDR_URL = "http://localhost:3002";
const STORAGE_KEY = "dummyWalletIdentifier";

export default function DummyWallet() {
  const [identifier, setIdentifier] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  // Prüft, ob ein Identifier existiert, oder erzeugt einen neuen
  useEffect(() => {
    async function checkOrCreateIdentifier() {
      const storedId = localStorage.getItem(STORAGE_KEY);

      if (!storedId) {
        console.log("Kein Identifier gefunden, erzeuge neuen...");
        const { userId, publicJWK } = await createUserIdentifier();

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ id: userId, publicKey: publicJWK })
        );
        setIdentifier(userId);
        setPublicKey(JSON.stringify(publicJWK, null, 2));

        await registerUserWithVDR(userId, publicJWK);
      } else {
        const storedData = JSON.parse(storedId);
        console.log("Identifier gefunden:", storedData.id);
        setIdentifier(storedData.id);
        setPublicKey(JSON.stringify(storedData.publicKey, null, 2));
      }
    }

    checkOrCreateIdentifier();
  }, []);

  async function createUserIdentifier() {
    const userId = crypto.randomUUID();
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

    // Private & Public Key exportieren
    const privateKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.privateKey
    );
    const publicKey = await window.crypto.subtle.exportKey(
      "jwk",
      keyPair.publicKey
    );

    // Private Key im Browser speichern (nicht sicher, aber für Dummy-Zwecke)
    localStorage.setItem("dummyWalletPrivateKey", JSON.stringify(privateKey));

    return { userId, publicJWK: publicKey };
  }

  // **Benutzer im Dummy VDR registrieren**
  async function registerUserWithVDR(userId: string, publicKey: object) {
    const response = await fetch(`${DUMMY_VDR_URL}/register-identifier`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: userId, publicKey }),
    });

    const data = await response.json();
    if (data.success) {
      console.log("Benutzer erfolgreich im Dummy VDR registriert:", userId);
    } else {
      console.error("Fehler bei der Benutzerregistrierung:", data.error);
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dummy Wallet</h1>
      <p>
        <strong>Identifier:</strong> {identifier || "Wird erstellt..."}
      </p>
      <h2>Meine Credentials</h2>
      <button onClick={() => localStorage.clear()}>
        🗑 Identifier & Daten löschen
      </button>
    </div>
  );
}
