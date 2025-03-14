"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { BACKEND_URL } from "../../constants";
import { useWebSocket } from "../WebSocketContext";

export default function Dashboard() {
  const router = useRouter();
  const { offers, sessionId } = useWebSocket();
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [supportedSchemas, setSupportedSchemas] = useState<Map<string, string>>(
    new Map()
  );

  useEffect(() => {
    async function fetchSupportedSchemas() {
      try {
        const response = await fetch(`${BACKEND_URL}/get-schemas`, {
          method: "GET",
          headers: { "ngrok-skip-browser-warning": "true" },
        });

        if (!response.ok) {
          console.error("❌ Fehler beim Abrufen der Schemata!");
          return;
        }

        const data = await response.json();

        // Konvertiere das Objekt in eine Map
        const schemaMap: Map<string, string> = new Map(
          Object.entries(data.schemas)
        );

        setSupportedSchemas(schemaMap);
      } catch (error) {
        console.error("❌ Netzwerkfehler beim Abrufen der Schemata!", error);
      }
    }

    fetchSupportedSchemas();
  }, []);

  useEffect(() => {
    if (offers.length === 0) {
      setQrData(null);
      setShowQR(false);
    }
  }, [offers]);

  async function requestCredentialOffer(schemaType: string) {
    const schemaId = supportedSchemas.get(schemaType);
    if (!sessionId || !schemaId) {
      alert("Keine Session ID oder Schema ID gefunden");
      return;
    }

    const response = await fetch(`${BACKEND_URL}/offer-credential`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, schemaId, schemaType }),
    });

    if (!response.ok) {
      alert("Fehler beim Anfordern des Credentials");
      return;
    }

    const result = await response.json();
    if (result.url) {
      setQrData(result.url);
      setShowQR(true);
    } else {
      alert("Credential Offer gesendet!");
    }
  }

  function logout() {
    localStorage.removeItem("authToken");
    router.push("/");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold mb-4">📚 Geschütztes Dashboard</h1>
        <p className="text-gray-600 mb-6">Willkommen im Studienportal!</p>

        {/* Kachel für Studienbescheinigung */}
        <div
          className="bg-blue-100 p-6 rounded-lg shadow-md border border-blue-300 w-full cursor-pointer hover:bg-blue-200 transition relative"
          onClick={() => requestCredentialOffer("EnrollmentCredential")}
        >
          <h2 className="text-lg font-semibold text-blue-900">
            📜 Studienbescheinigung ausstellen
          </h2>
          <p className="text-sm text-gray-700 mt-2">
            Erhalte eine digitale Studienbescheinigung als Verifiable
            Credential.
          </p>

          {/* QR-Code mit Fade-in Effekt */}
          {showQR && qrData && (
            <div className="mt-4 flex flex-col items-center justify-center">
              <QRCode value={qrData} />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Scanne den QR-Code mit deiner Wallet.
              </p>

              {/* Button zum Öffnen der Wallet in einem neuen Tab */}
              <a
                href={qrData}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:bg-blue-600 hover:scale-105 active:scale-95"
              >
                🌐 Wallet im Browser öffnen
              </a>
            </div>
          )}
        </div>

        {/* Abmelden-Button */}
        <button
          onClick={logout}
          className="mt-6 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:bg-red-600 hover:scale-105 active:scale-95 w-full"
        >
          🚪 Abmelden
        </button>
      </div>
    </div>
  );
}
