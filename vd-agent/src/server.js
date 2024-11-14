"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const setup_1 = require("./setup"); // Importiere den Agenten aus setup.ts
const app = (0, express_1.default)();
const PORT = 3000;
// Middleware, um JSON-Requests zu parsen
app.use(express_1.default.json());
// Beispielroute zur Verifizierung eines Credentials
app.post('/verify-credential', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { credential } = req.body;
        const result = yield setup_1.agent.verifyCredential({ credential });
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
}));
// Beispielroute zum Ausstellen eines Credentials
app.post('/issue-credential', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subject, claims } = req.body;
        const credential = yield setup_1.agent.createVerifiableCredential({
            credential: {
                issuer: { id: 'did:ethr:yourDID' },
                subject,
                type: ['VerifiableCredential'],
                issuanceDate: new Date().toISOString(),
                credentialSubject: claims,
            },
            proofFormat: 'jwt', // Falls JWT als Format verwendet wird
        });
        res.json(credential);
    }
    catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        }
    }
}));
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
