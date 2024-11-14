import express, { Request, Response } from 'express';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware, um JSON-Requests zu parsen
app.use(express.json());

// Einfache GET-Route, um zu prüfen, ob der Server läuft
app.get('/', (req: Request, res: Response) => {
  res.send('Backend server is running!');
});

// POST-Route zur Verifizierung eines VC
app.post('/verify-credential', async (req: Request, res: Response) => {
  try {
    const { verifiableCredential } = req.body;

    // Anfrage an den VC-Service zum Verifizieren des Credentials
    const response = await axios.post('http://localhost:3000/verify-credential', {
      verifiableCredential,
    });

    // Ergebnis der Verifizierung zurückgeben
    res.json(response.data);
  } catch (error) {
    console.error('Error verifying credential:', (error as Error).message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.get('/verify-demo-vc', async (req: Request, res: Response) => {
  try {
    // Hardcodiertes Demo-VC
    const demoVC = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiableCredential"],
      "credentialSubject": {
        "id": "did:example:123",
        "name": "Alice"
      },
      "issuer": {
        "id": "did:ethr:sepolia:0x0386529f311bf92c9e32282eaaecbfb346fca888e10683cc1c0a02aceb3dec6a5c"
      },
      "issuanceDate": "2023-01-01T00:00:00Z",
      "proof": {
        "type": "JwtProof2020",
        "jwt": "eyJhbGciOi..." // Beispiel-JWT oder Testwert
      }
    };

    // Anfrage an den VC-Service zur Verifizierung des Demo-VCs
    const response = await axios.post('http://localhost:3000/verify-credential', {
      credential: demoVC,
    });

    // Ergebnis der Verifizierung zurückgeben
    res.json(response.data);
  } catch (error) {
    console.error('Error verifying demo credential:', (error as Error).message);
    res.status(500).json({ error: 'Verification of demo credential failed' });
  }
});

app.get('/generate-demo-vc', async (req: Request, res: Response) => {
  try {
    // Daten für das Demo-VC
    const subject = 'did:ethr:sepolia:0x0386529f311bf92c9e32282eaaecbfb346fca888e10683cc1c0a02aceb3dec6a5c';
    const claims = { name: 'Alice' };

    // Erstelle das VC über den VC-Service
    const response = await axios.post('http://localhost:3000/issue-credential', {
      subject,
      claims,
    });

    // Erfolgreich generiertes VC zurückgeben
    res.json(response.data);
  } catch (error) {
    console.error('Error generating demo VC:', (error as Error).message);
    res.status(500).json({ error: 'Demo VC generation failed' });
  }
});


// Server starten
app.listen(PORT, () => {
  console.log(`Backend server läuft auf http://localhost:${PORT}`);
});
