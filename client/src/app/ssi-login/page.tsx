"use client";

import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import QRCode from "react-qr-code";
import { BACKEND_URL, FRONTEND_URL } from "../constants";

export default function SSILoginPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wss = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1️⃣ Session-ID direkt im Frontend generieren
    const newSessionId = uuidv4();
    setSessionId(newSessionId);

    // 2️⃣ WebSocket-Verbindung mit dieser Session-ID aufbauen
    function connectWebSocket(sessionId: string) {
      const wsUrl = BACKEND_URL.replace(/^http/, "ws");
      wss.current = new WebSocket(wsUrl);

      wss.current.onopen = () => {
        console.log("✅ WebSocket verbunden!");
        wss.current?.send(
          JSON.stringify({
            type: "register-session",
            sessionId,
          })
        );
      };

      wss.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("📩 Nachricht vom Server:", message);
      };

      wss.current.onclose = () => {
        console.log("⚠️ WebSocket geschlossen. Versuche Reconnect...");
        setTimeout(() => connectWebSocket(sessionId), 3000);
      };

      wss.current.onerror = (error) => {
        console.error("❌ WebSocket-Fehler:", error);
      };
    }

    connectWebSocket(newSessionId);

    return () => {
      if (wss.current) {
        console.log("❌ WebSocket wird geschlossen!");
        wss.current.close();
        wss.current = null;
      }
    };
  }, []);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md text-center border border-gray-200">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">🔐 SSI-Login</h1>
      <p className="mb-4 text-gray-600">
        📷 QR-Code scannen, um sich zu verifizieren:
      </p>

      {sessionId && (
        <div className="bg-gray-100 p-6 rounded-lg inline-block shadow-md border border-gray-300">
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
  );
}
