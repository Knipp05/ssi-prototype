const fs = require("fs");
const readline = require("readline");
const { exec, execSync } = require("child_process");

// Frage den Benutzer, ob ngrok genutzt werden soll
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.toLowerCase());
    }));
}

// Startet ngrok, falls es genutzt werden soll
function startNgrok() {
    try {
        execSync("ngrok --version", { stdio: "ignore" });
    } catch (error) {
        console.error("\x1b[31mFehler: ngrok ist nicht installiert!\x1b[0m");
        console.log("\x1b[33mLade es hier herunter:\x1b[0m https://ngrok.com/download");
        console.log("\x1b[32mOder installiere es mit:\x1b[0m npm i -g ngrok");
        
        process.exit(1);
    }
    console.log("Starte ngrok...");
    exec("ngrok start --all --config ./ngrok.yml", { stdio: "ignore", detached: true });
}

// Holt die aktiven ngrok-Tunnel
function getNgrokTunnels() {
    try {
        const result = execSync("curl -s http://127.0.0.1:4040/api/tunnels", { encoding: "utf8" });
        return JSON.parse(result).tunnels;
    } catch (error) {
        console.error("Fehler beim Abrufen der ngrok-Tunnel:", error.message);
        process.exit(1);
    }
}

// Extrahiert die ngrok-URLs oder fällt auf `localhost` zurück
function extractUrls(useNgrok, tunnels) {
    if (!useNgrok) {
        return {
            frontend: "http://localhost:3000",
            backend: "http://localhost:3001",
            vdr: "http://localhost:3002",
        };
    }

    const frontend = tunnels.find(tunnel => tunnel.name === "frontend")?.public_url;
    const backend = tunnels.find(tunnel => tunnel.name === "backend")?.public_url;
    const vdr = tunnels.find(tunnel => tunnel.name === "vdr")?.public_url;

    if (!frontend || !backend || !vdr) {
        console.error("Konnte nicht alle ngrok-URLs extrahieren. Nutze `localhost`-Fallback.");
        return extractUrls(false, []); // Falls ngrok fehlschlägt, fallback auf localhost
    }

    return { frontend, backend, vdr };
}

// Aktualisiert die `.env`-Datei
function updateEnvFile(frontendUrl, backendUrl, vdrUrl) {
    const envContent = `NEXT_PUBLIC_BACKEND_URL=${backendUrl}
NEXT_PUBLIC_VDR_URL=${vdrUrl}
NEXT_PUBLIC_FRONTEND_URL=${frontendUrl}
    `;

    fs.writeFileSync(".env", envContent);
    console.log(`Frontend ist erreichbar unter: \x1b[36m${frontendUrl}\x1b[0m`);

}

// Hauptfunktion
(async function () {
    const answer = await askQuestion("ngrok verwenden, um die Wallet über ein anderes Gerät zu nutzen? (y/n): ");
    const useNgrok = answer === "y";

    if (useNgrok) {
        startNgrok();
        console.log("Warte 5 Sekunden, bis ngrok gestartet ist...");
        setTimeout(() => {
            const tunnels = getNgrokTunnels();
            const { frontend, backend, vdr } = extractUrls(true, tunnels);
            updateEnvFile(frontend, backend, vdr);
        }, 5000);
    } else {
        console.log("Verwende `localhost` für alle Dienste.");
        const { frontend, backend, vdr } = extractUrls(false, []);
        updateEnvFile(frontend, backend, vdr);
    }
})();
