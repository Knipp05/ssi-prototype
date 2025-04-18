# SSI Prototype

Dieses Projekt ist ein **SSI (Self-Sovereign Identity) Prototype**, der die grundlegenden Konzepte von Verifiable Credentials demonstriert. Die Anwendung besteht aus einem **Frontend (Next.js) mit integrierter dummy Wallet**, einem **Backend (Express.js)** und einem **dummy VDR (Verifiable Data Registry) (Express.js)**.

## 📌 Funktionen

- Anmeldung mit **klassischem Login** oder **Verifiable Credentials**
- Ausstellung und Überprüfung von **Studienbescheinigungen** und **Exmatrikulationsbescheinigungen**
- **QR-Code** für den Credential-Austausch mit einer Wallet
- **WebSocket-Verbindung** für den Credential-Transfer
- **JWT-Authentifizierung** mit Middleware-Schutz
- **ngrok-Tunneling** für https Verbindungen
- **Docker-Setup** für einfaches Deployment

## 🏗️ Installation & Setup

### 1️⃣ Voraussetzungen

- Node.js (>= 18)
- Docker & Docker Compose
- Ngrok (falls Wallet auf externen Geräten (z.B. Smartphone) verwendet werden soll)

### 2️⃣ Projekt klonen

```sh
git clone https://https://github.com/Knipp05/ssi-prototype.git
cd ssi-prototype
```

### 3️⃣ .env Datei erstellen

Kopiere die Beispieldatei und passe die Werte an:

```sh
cd server
cp .env.example .env
```

Falls **kein ngrok** genutzt wird, werden **localhost-Adressen** verwendet.

### 4️⃣ Starten der Anwendung
```sh
# URL in .env setzen und ggf. ngrok starten
node update-env.js
```

#### Mit Docker

```sh
docker compose up --build
```

#### Ohne Docker
```sh
cd client && npm install
cd ../server && npm install
cd ../vdr && npm install
```

Führe die folgenden Befehle jeweils in eigenen Terminals aus:

```sh
# VDR starten
cd vdr && npm run build && npm start

# Backend starten
cd ../server && npm run build && npm start

# Frontend starten
cd ../client && npm run build && npm start
```

Die Anwendung ist dann unter einer dynamischen ngrok-URL (siehe Terminal update-env.js) oder `http://localhost:3000` erreichbar.

## 📌 Verwendung

Zum Test der Anwendung stehen zwei **Demo-Benutzer** mit folgenden Zugangsdaten zur Verfügung:

### 🧑‍🎓 Benutzer 1

- **Benutzername:** `tschmidt`
- **Passwort:** `tsch123`

### 🧑‍🎓 Benutzer 2

- **Benutzername:** `smeier`
- **Passwort:** `smei456`

🔐 **Hinweis:** Diese Zugangsdaten dienen nur zu Demonstrationszwecken.

## 📡 API Endpunkte

### 🔐 Authentifizierung

- `POST /login` → Login mit Benutzername & Passwort
- `POST /verify-token` → JWT-Überprüfung

### 🎓 Credentials

- `POST /issue-credential` → Ausstellung eines Credentials
- `POST /verify-credential` → Überprüfung eines Credentials

## 📜 Lizenz

Dieses Projekt steht unter der **MIT-Lizenz**.
