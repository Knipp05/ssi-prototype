"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../constants";
import { CredentialOffer } from "../types";

const WebSocketContext = createContext<{
  offers: CredentialOffer[];
  sessionId: string;
}>({ offers: [], sessionId: "" });

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [offers, setOffers] = useState<CredentialOffer[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    function connectWebSocket() {
      const wsUrl = BACKEND_URL.replace(/^http/, "ws");
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("✅ WebSocket verbunden!");
        wsRef.current?.send(
          JSON.stringify({
            type: "register-session",
          })
        );
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("📩 Nachricht vom Server:", message);

        if (message.type === "register-session") {
          setSessionId(message.sessionId);
        }

        if (message.type === "offer-deleted") {
          setOffers((prevOffers) =>
            prevOffers.filter((offer) => offer.offerId !== message.offerId)
          );
        }

        if (message.type === "credential-offer") {
          setOffers((prevOffers) => [...prevOffers, message.offer]);
        }
      };

      wsRef.current.onclose = () => {
        console.log("⚠️ WebSocket getrennt. Versuche Reconnect...");
        setTimeout(() => connectWebSocket(), 1000);
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket-Fehler:", error);
      };
    }

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ sessionId, offers }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
