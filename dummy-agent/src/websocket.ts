/* import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 3003 });
const sessions = new Map<string, WebSocket>(); // Speichert Session-IDs & WebSockets

wss.on("connection", (ws) => {
    console.log("✅ WebSocket-Verbindung hergestellt!");

    ws.on("message", (message) => {
        const data = JSON.parse(message.toString());

        if (data.type === "register-session") {
            sessions.set(data.sessionId, ws);
            console.log(`🔹 Session ${data.sessionId} registriert.`);
        }
    });

    ws.on("close", () => {
        console.log("❌ WebSocket-Verbindung geschlossen.");
        sessions.forEach((socket, sessionId) => {
            if (socket === ws) {
                sessions.delete(sessionId);
            }
        });
    });
});

// Funktion zum Senden des Ergebnisses an die Login-Seite
export function sendVerificationResult(sessionId: string, result: boolean) {
    const ws = sessions.get(sessionId);
    if (ws) {
        ws.send(JSON.stringify({ type: "verification-result", success: result }));
        console.log(`✅ Verifikation für Session ${sessionId} gesendet.`);
    }
} */
