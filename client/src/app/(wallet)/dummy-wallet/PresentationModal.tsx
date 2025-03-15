import { useState } from "react";
import { BACKEND_URL } from "../../constants";
import { PresentationRequest, VC } from "../../types";

export default function PresentationModal({
  request,
  credentials,
  onClose,
}: {
  request: PresentationRequest;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credentials: VC<Record<string, any>>[];
  onClose: () => void;
}) {
  const [selectedCredential, setSelectedCredential] = useState<VC<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
  > | null>(null);

  async function handleSubmit() {
    if (!selectedCredential) {
      alert("Bitte ein Credential auswählen!");
      return;
    }

    // 🔹 Erstelle Verifiable Presentation (VP)
    const vp = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiablePresentation"],
      verifiableCredential: [selectedCredential],
      holder: selectedCredential.credentialSubject.id,
    };

    console.log("🔹 VP gesendet:", vp);

    // 🔹 Sende die VP ans Backend
    const response = await fetch(`${BACKEND_URL}/verify-vp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vp, sessionId: request.sessionId }),
    });

    const result = await response.json();
    if (result.verified) {
      alert("✅ VP erfolgreich verifiziert!");
      onClose(); // Modal schließen
    } else {
      alert("❌ Verifizierung fehlgeschlagen!");
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
        <h2 className="text-lg font-bold mb-4">Wähle ein Credential</h2>
        {credentials.length > 0 ? (
          <ul className="space-y-2">
            {credentials.map((cred, index) => (
              <li
                key={index}
                className={`p-2 border rounded cursor-pointer ${
                  selectedCredential === cred
                    ? "bg-blue-300"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => setSelectedCredential(cred)}
              >
                {cred.type.join(", ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-red-500">Keine passenden Credentials gefunden!</p>
        )}
        <div className="mt-4 flex justify-end space-x-2">
          <button className="bg-gray-400 px-3 py-1 rounded" onClick={onClose}>
            Abbrechen
          </button>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!selectedCredential}
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}
