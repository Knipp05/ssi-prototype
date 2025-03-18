# SSI Prototype

Dieses Projekt ist ein **SSI (Self-Sovereign Identity) Prototype**, der die grundlegenden Konzepte von Verifiable Credentials demonstriert. Die Anwendung besteht aus einem **Frontend (Next.js)**, einem **Backend (Express.js)** und einem **VDR (Verifiable Data Registry)**.

## 📌 Funktionen

- Anmeldung mit **klassischem Login** oder **Verifiable Credentials**
- Ausstellung und Überprüfung von **Studienbescheinigungen** und **Exmatrikulationsbescheinigungen**
- **QR-Code** für den Credential-Austausch mit einer Wallet
- **WebSocket-Verbindung** für den Credential-Transfer
- **JWT-Authentifizierung** mit Middleware-Schutz
- **Docker-Setup** für einfaches Deployment

## 🏗️ Installation & Setup

### 1️⃣ Voraussetzungen

- Node.js (>= 18)
- Docker & Docker Compose
- Ngrok (falls erforderlich)

### 2️⃣ Projekt klonen

```sh
git clone https://github.com/dein-repo/ssi-prototype.git
cd ssi-prototype
```

### 3️⃣ Abhängigkeiten installieren

```sh
cd client && npm install
cd ../server && npm install
cd ../vdr && npm install
```

### 4️⃣ .env Datei erstellen

Kopiere die Beispieldatei und passe die Werte an:

```sh
cp .env.example .env
```

Falls **ngrok** genutzt werden soll, kann das Skript die URLs automatisch setzen:

```sh
node scripts/setup-ngrok.js
```

Falls **kein ngrok** genutzt wird, werden **localhost-Adressen** verwendet.

### 5️⃣ Starten der Anwendung

#### Mit Docker

```sh
docker-compose up --build
```

#### Ohne Docker

```sh
# VDR starten
cd vdr && npm start

# Backend starten
cd ../server && npm start

# Frontend starten
cd ../client && npm run dev
```

Die Anwendung ist dann unter `http://localhost:3000` erreichbar.

## 📡 API Endpunkte

### 🔐 Authentifizierung

- `POST /login` → Login mit Benutzername & Passwort
- `POST /verify-token` → JWT-Überprüfung

### 🎓 Credentials

- `POST /issue-credential` → Ausstellung eines Credentials
- `POST /verify-credential` → Überprüfung eines Credentials

## 🚀 Deployment

Für ein Live-Deployment kann z. B. **Vercel** (Frontend) und **Railway/Fly.io** (Backend) genutzt werden.

## 🛠️ Entwicklung & Debugging

- `.env` Datei für Konfigurationswerte anpassen
- Logs in **Docker-Containern** ansehen: `docker logs -f container_name`
- WebSocket-Kommunikation debuggen mit **Browser DevTools**

## 📜 Lizenz

Dieses Projekt steht unter der **MIT-Lizenz**.
