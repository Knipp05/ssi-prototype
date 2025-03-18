"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../constants";
import { CredentialOffer, PresentationRequest } from "../types";
import { useRouter } from "next/navigation";

const WebSocketContext = createContext<{
  offers: CredentialOffer[];
  requests: PresentationRequest[];
  sessionId: string;
  loginError: boolean;
}>({ offers: [], requests: [], sessionId: "", loginError: false });

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [offers, setOffers] = useState<CredentialOffer[]>([]);
  const [requests, setRequests] = useState<PresentationRequest[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [loginError, setLoginError] = useState(false);
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

      wsRef.current.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log("📩 Nachricht vom Server:", message);

        if (message.type === "register-session") {
          setSessionId(message.sessionId);
        }

        if (message.type === "verification-success") {
          localStorage.setItem("user", message.user);
          localStorage.setItem("authToken", message.jwt);
          router.push("/dashboard");
        }

        if (message.type === "offer-deleted") {
          setOffers((prevOffers) =>
            prevOffers.filter((offer) => offer.offerId !== message.offerId)
          );
        }

        if (message.type === "request-deleted") {
          setRequests((prevRequests) =>
            prevRequests.filter(
              (request) => request.requestId !== message.requestId
            )
          );
          setLoginError(true);
        }

        if (message.type === "credential-offer") {
          setOffers((prevOffers) => [...prevOffers, message.offer]);
        }
      };

      wsRef.current.onclose = () => {
        console.log("⚠️ WebSocket getrennt. Versuche Reconnect...");
        setTimeout(() => connectWebSocket(), 10000);
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket-Fehler:", error);
      };
    }

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, [router]);

  return (
    <WebSocketContext.Provider
      value={{ sessionId, offers, requests, loginError }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
