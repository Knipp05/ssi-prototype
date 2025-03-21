"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket } from "../WebSocketContext";
import QRCode from "react-qr-code";
import { FRONTEND_URL, BACKEND_URL } from "../../constants";

export default function Home() {
  const router = useRouter();
  const { sessionId, requests, loginError } = useWebSocket(); // 🎯 WebSocket aus Context verwenden
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showSSI, setShowSSI] = useState(false);

  useEffect(() => {
    if (requests.length === 0) {
      setShowSSI(false);
    }
    if (loginError) {
      alert(
        "❌ Beim Login mit SSI ist ein Fehler aufgetreten. Bitte erneut versuchen oder andere Anmeldemethode verwenden!"
      );
    }
  }, [requests, loginError]);

  async function handleLogin() {
    const response = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, sessionId }),
    });

    if (!response.ok) {
      alert("❌ Login fehlgeschlagen!");
      return;
    }

    const result = await response.json();
    console.log("🔓 Login erfolgreich!");
    localStorage.setItem("user", result.username);
    localStorage.setItem("authToken", result.jwt);
    router.push("/dashboard");
  }

  async function handleSSILogin() {
    setShowSSI(true);
    const response = await fetch(`${BACKEND_URL}/ssi-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        requiredSchemaType: "EnrollmentCredential",
      }),
    });
    if (!response.ok) {
      console.error("Fehler bei SSI Login Anfrage");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-black">
          🎓 Musterstudienportal
        </h1>

        {/* 🔐 Benutzername/Passwort Login */}
        <div className="space-y-4">
          <input
            type="text"
            value={username}
            placeholder="Benutzername"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 text-black"
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            value={password}
            placeholder="Passwort"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200 text-black"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white py-2 rounded-lg shadow-md hover:bg-blue-600 transition"
          >
            🔑 Anmelden
          </button>
          <button
            onClick={handleSSILogin}
            className="w-full bg-green-500 text-white py-2 rounded-lg shadow-md hover:bg-green-600 transition"
          >
            🆔 Mit SSI anmelden
          </button>
        </div>

        {/* 🔗 SSI-Login Bereich */}
        {showSSI && sessionId && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-center shadow-md">
            <h2 className="text-lg font-semibold mb-2">🔐 SSI-Login</h2>
            <p className="text-gray-600 text-sm mb-2">
              📷 QR-Code scannen, um sich zu verifizieren:
            </p>
            <QRCode
              value={`${FRONTEND_URL}/dummy-wallet?sessionId=${sessionId}`}
              className="mb-4 mx-auto"
            />
            <a
              href={`${FRONTEND_URL}/dummy-wallet?sessionId=${sessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md transition-all duration-300 hover:bg-blue-600 hover:scale-105 active:scale-95"
            >
              🌐 Wallet in neuem Tab öffnen
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
