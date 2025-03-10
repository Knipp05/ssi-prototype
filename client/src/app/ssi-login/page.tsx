"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { BACKEND_URL, FRONTEND_URL } from "../constants";

export default function SSILoginPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wss = useRef<WebSocket | null>(null);

  useEffect(() => {
    async function createSession() {
      // 1️⃣ Backend fragt eine neue Session-ID an
      const response = await fetch(`${BACKEND_URL}/create-session`, {
        method: "GET",
        headers: {
          "ngrok-skip-browser-warning": "true",
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setSessionId(data.sessionId);

      // 2️⃣ WebSocket-Verbindung herstellen
      connectWebSocket(data.sessionId);
    }

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

    createSession();

    return () => {
      if (wss.current) {
        console.log("❌ WebSocket wird geschlossen!");
        wss.current.close();
        wss.current = null;
      }
    };
  }, []);

  return (
    <div>
      <h1>🔐 SSI-Login</h1>
      <p>📷 QR-Code scannen, um sich zu verifizieren:</p>
      {sessionId && (
        <QRCode value={`${FRONTEND_URL}/dummy-wallet?sessionId=${sessionId}`} />
      )}
    </div>
  );
}
