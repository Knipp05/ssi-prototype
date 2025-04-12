"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { BACKEND_URL } from "../../constants";
import { useWebSocket } from "../WebSocketContext";

const initQrData: Record<string, string> = {
  EnrollmentCredential: "",
  ExmatriculationCredential: "",
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const { offers, sessionId } = useWebSocket();
  const [qrData, setQrData] = useState(initQrData);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    if (isValidated && offers.length === 0) {
      setQrData(initQrData);
    }
  }, [offers, isValidated]);

  useEffect(() => {
    async function validateToken() {
      const token = localStorage.getItem("authToken");
      if (!token) {
        router.replace("/login");
        return;
      }
      const response = await fetch(`${BACKEND_URL}/verify-token`, {
        method: "POST",
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        console.error("Fehler bei Validierung des Token");
        router.replace("/login");
        return;
      }
      const result = await response.json();
      console.log("isValid:", result.isValid);
      if (!result.isValid) {
        console.error("Ungültiges Token");
        router.replace("/login");
        return;
      }
      console.log("Validierung erfolgreich!");
      setIsValidated(true);
      setUser(localStorage.getItem("user"));
    }
    validateToken();
  }, [router]);

  async function requestCredentialOffer(schemaType: string) {
    if (!sessionId || !schemaType) {
      alert("Keine Session ID oder Schema Typ gefunden");
      return;
    }

    const response = await fetch(`${BACKEND_URL}/offer-credential`, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId, schemaType }),
    });

    if (!response.ok) {
      alert("Fehler beim Anfordern des Credentials");
      return;
    }

    const result = await response.json();
    if (result.url) {
      setQrData((oldQrData) => {
        return { ...oldQrData, [schemaType]: result.url };
      });
    } else {
      alert("Credential Offer gesendet!");
    }
  }

  function logout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    router.push("/login");
  }

  return (
    isValidated && (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl text-center">
          <h1 className="text-2xl font-bold mb-6 text-black">📚 Dashboard</h1>
          <p className="text-gray-600 mb-8">
            Willkommen im Studienportal, {user}!
          </p>

          <div className="flex flex-row justify-center gap-6 w-full items-stretch">
            {/* Studienbescheinigung */}
            <div
              className="bg-blue-100 p-6 rounded-lg shadow-md border border-blue-300 w-1/2 cursor-pointer hover:bg-blue-200 transition flex flex-col h-full"
              onClick={() => requestCredentialOffer("EnrollmentCredential")}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">📜</div>
                <h2 className="text-lg font-semibold text-blue-900 break-words hyphens-auto leading-snug">
                  Studienbescheinigung
                </h2>
                <div className="text-blue-800 mt-1">ausstellen</div>
                <p className="text-sm text-gray-700 mt-2 text-center">
                  Erhalte eine digitale Studienbescheinigung als Verifiable
                  Credential.
                </p>

                {qrData["EnrollmentCredential"] && (
                  <div className="mt-4 flex flex-col items-center">
                    <QRCode value={qrData["EnrollmentCredential"]} size={128} />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Scanne den QR-Code mit deiner Wallet.
                    </p>
                    <a
                      href={qrData["EnrollmentCredential"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:bg-blue-600 hover:scale-105 active:scale-95"
                    >
                      🌐 Wallet im Browser öffnen
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => e.stopPropagation()}
                className="mt-4 px-4 py-2 bg-gray-200 text-black font-semibold rounded-lg shadow hover:bg-gray-300 transition"
              >
                📄 Als PDF herunterladen
              </button>
            </div>

            {/* Exmatrikulationsbescheinigung */}
            <div
              className="bg-blue-100 p-6 rounded-lg shadow-md border border-blue-300 w-1/2 cursor-pointer hover:bg-blue-200 transition flex flex-col h-full"
              onClick={() =>
                requestCredentialOffer("ExmatriculationCredential")
              }
            >
              <div className="text-center">
                <div className="text-2xl mb-1">📜</div>
                <h2 className="text-lg font-semibold text-blue-900 break-words hyphens-auto leading-snug">
                  Exmatrikulationsbescheinigung
                </h2>
                <div className="text-blue-800 mt-1">ausstellen</div>
                <p className="text-sm text-gray-700 mt-2 text-center">
                  Erhalte eine digitale Exmatrikulationsbescheinigung als VC.
                </p>

                {qrData["ExmatriculationCredential"] && (
                  <div className="mt-4 flex flex-col items-center">
                    <QRCode
                      value={qrData["ExmatriculationCredential"]}
                      size={128}
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Scanne den QR-Code mit deiner Wallet.
                    </p>
                    <a
                      href={qrData["ExmatriculationCredential"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:bg-blue-600 hover:scale-105 active:scale-95"
                    >
                      🌐 Wallet im Browser öffnen
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={(e) => e.stopPropagation()}
                className="mt-4 px-4 py-2 bg-gray-200 text-black font-semibold rounded-lg shadow hover:bg-gray-300 transition"
              >
                📄 Als PDF herunterladen
              </button>
            </div>
          </div>

          {/* Abmelden-Button */}
          <button
            onClick={logout}
            className="mt-8 px-5 py-3 bg-red-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:bg-red-600 hover:scale-105 active:scale-95 w-full"
          >
            🚪 Abmelden
          </button>
        </div>
      </div>
    )
  );
}
