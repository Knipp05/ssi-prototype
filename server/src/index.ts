import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { initDB } from "./database.js";
import { initSupportedSchemas, initIssuer, offerCredential, acceptCredentialOffer, declineOffer } from "./issuer.js";
import { BACKEND_URL, FRONTEND_URL, PORT } from "./constants.js";
import { authenticateJWT, declineRequest, loginUser, requestPresentation, verifyPresentation } from "./verifier.js";
import { CredentialOffer, PresentationRequest } from "./types.js";
import { v4 as uuidv4 } from "uuid"

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server })

export const activeSessions = new Map<string, WebSocket>();
export const activeWallets = new Map<string, WebSocket>();
export const pendingOffers = new Map<string, CredentialOffer>();
export const pendingRequests = new Map<string, PresentationRequest>();
export const activeUsers = new Map<string, number>();

export const supportedSchemas = await initSupportedSchemas();

app.use(cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "ngrok-skip-browser-warning", "Authorization"]
}));
app.use(express.json());

(async () => {
    await initDB();

    await initIssuer()

    wss.on("connection", (ws) => {
        console.log("🔗 WebSocket verbunden!");
    
        ws.on("message", (message) => {
            try {
                const { type, sessionId } = JSON.parse(message.toString());

                if (type === "register-session") {
                    const sessionId = uuidv4();
                    activeSessions.set(sessionId, ws);
                    console.log(`Session ${sessionId} registriert`);
                    ws.send(JSON.stringify({ type: "register-session", sessionId}))
                } else if (type === "register-wallet" && sessionId) {
                    if(!activeSessions.get(sessionId)) {
                        ws.send(JSON.stringify({ type: "register-error" }));
                        return;
                    }
                    activeWallets.set(sessionId, ws)

                    const openOffers = Array.from(pendingOffers.values())
                        .filter((offer) => offer.sessionId === sessionId);

                    if (openOffers.length > 0) {
                        openOffers.forEach(offer => ws.send(JSON.stringify({ type: "credential-offer", offer})))    
                    }

                    const openRequests = Array.from(pendingRequests.values())
                        .filter((request) => request.sessionId === sessionId);

                    if (openRequests.length > 0) {
                        openRequests.forEach(request => ws.send(JSON.stringify({ type: "presentation-request", request})))    
                    }
                }
                
                if (type === "verification-result" && sessionId) {
                    console.log(`Verifikation erfolgreich für Session: ${sessionId}`);

                    wss.clients.forEach(client => {
                        client.send(JSON.stringify({
                            type: "verification-success",
                            sessionId: sessionId
                        }));
                    });
                }

            } catch (error) {
                console.error("Fehler bei WebSocket-Nachricht: ", error)
            }
    
        });

        ws.on("close", () => {
            console.log("🔌 WebSocket getrennt");
    
            const closedClientSession = [...activeSessions.entries()]
                .find(([key, value]) => value === ws)?.[0];

            const closedWalletSession = [...activeWallets.entries()]
                .find(([key, value]) => value === ws)?.[0];
    
            if (closedClientSession) {
                console.log(`❌ Session ${closedClientSession} beendet`);
                activeSessions.delete(closedClientSession);
                activeUsers.delete(closedClientSession)
            } else if (closedWalletSession) {
                console.log(`❌ Session ${closedClientSession} beendet`);
                activeWallets.delete(closedWalletSession);
            }

            if (closedClientSession || closedWalletSession) {
                const removedOffers = [...pendingOffers.entries()]
                .filter(([_, value]) => value.sessionId === closedClientSession)
                .map(([key]) => key);
    
                removedOffers.forEach((offerId) => {
                    console.log(`🗑 Lösche Offer ${offerId}`);
                    pendingOffers.delete(offerId);
                });
    
                const dashboardSocket = activeSessions.get(closedClientSession || closedWalletSession!);
                if (dashboardSocket) {
                    removedOffers.forEach(offerId => {
                        dashboardSocket.send(JSON.stringify({ type: "offer_deleted", offerId }));
                    });
                }
            }
        });   
    
        ws.send(JSON.stringify({ message: "Verbindung erfolgreich!" }));
    });

    app.get("/", (req, res) => {
        res.send("✅ SSI Server läuft!");
    });

    app.post("/login", (req, res) => loginUser(req, res));

    app.post("/ssi-login", (req, res) => requestPresentation(req, res))

    app.post("/offer-credential", (req, res) => offerCredential(req, res))

    app.post("/accept-offer", (req, res) => acceptCredentialOffer(req, res))

    app.post("/decline-offer", (req, res) => declineOffer(req, res))

    app.post("/decline-request", (req, res) => declineRequest(req, res))

    app.post("/verify-presentation", (req, res) => verifyPresentation(req, res))

    app.post("/verify-token", (req, res) => authenticateJWT(req, res))

    server.listen(PORT,  () => {
        console.log(`✅ Server läuft auf ${BACKEND_URL}`);
    });
    
})();

