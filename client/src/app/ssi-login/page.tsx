"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { BACKEND_URL, FRONTEND_URL } from "../constants";

export default function SSILoginPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    async function createSession() {
      console.log(BACKEND_URL);
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
      ws.current = new WebSocket("ws://192.168.178.69:3003");
      ws.current.onopen = () => {
        console.log("✅ WebSocket verbunden!");
        ws.current?.send(
          JSON.stringify({
            type: "register-session",
            sessionId: data.sessionId,
          })
        );
      };
      /* socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                if (message.type === "verification-result" && message.success) {
                    console.log("✅ Verifikation erfolgreich!");
                    setVerified(true);
                }
            }; */
    }

    createSession();

    return () => {
      if (ws.current) {
        console.log("❌ WebSocket geschlossen!");
        ws.current.close();
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
