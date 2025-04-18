# Basis-Image für Node.js
FROM node:18-alpine

# Setze das Arbeitsverzeichnis
WORKDIR /app

# Kopiere package.json
COPY ./client/package.json .

# Installiere Abhängigkeiten
RUN npm install

COPY .env .env

# Kopiere den gesamten Code
COPY client ./

EXPOSE 3000

# Baue die Next.js Anwendung
RUN npm run build

# Starte die Next.js Anwendung
CMD ["npm", "start"]
