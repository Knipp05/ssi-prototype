"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BACKEND_URL } from "./constants";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 📌 Eingaben verarbeiten
  function handleInput(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    if (name === "username") setUsername(value);
    if (name === "password") setPassword(value);
  }

  // 🔑 Login-Prozess
  async function handleLogin() {
    if (!username || !password) {
      setError("Bitte Benutzername und Passwort eingeben.");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.jwt) {
        localStorage.setItem("authToken", data.jwt);
        router.push("/dashboard");
      } else {
        setError("❌ Ungültige Anmeldedaten");
      }
    } catch (error) {
      console.error("Fehler beim Login:", error);
      setError("❌ Fehler beim Server. Bitte später erneut versuchen.");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          🎓 Musterstudienportal
        </h1>

        {/* Fehleranzeige */}
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <div className="space-y-4">
          <input
            type="text"
            value={username}
            name="username"
            placeholder="Benutzername"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200"
            onChange={handleInput}
          />
          <input
            type="password"
            value={password}
            name="password"
            placeholder="Passwort"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200"
            onChange={handleInput}
          />
          <button
            onClick={handleLogin}
            className="w-full bg-blue-500 text-white py-2 rounded-lg shadow-md hover:bg-blue-600 transition"
          >
            🔑 Anmelden
          </button>
          <button
            onClick={() => router.push("/ssi-login")}
            className="w-full bg-green-500 text-white py-2 rounded-lg shadow-md hover:bg-green-600 transition"
          >
            🆔 Über SSI anmelden
          </button>
        </div>
      </div>
    </div>
  );
}
