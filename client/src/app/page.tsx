"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          🎓 Musterstudienportal
        </h1>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Benutzername"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200"
          />
          <input
            type="password"
            placeholder="Passwort"
            className="w-full px-4 py-2 border rounded-lg focus:ring focus:ring-blue-200"
          />
          <button className="w-full bg-blue-500 text-white py-2 rounded-lg shadow-md hover:bg-blue-600 transition">
            🔑 Anmelden
          </button>
          <button
            onClick={() => router.push("/ssi-login")}
            className="w-full bg-green-500 text-white py-2 rounded-lg shadow-md hover:bg-green-600 transition"
          >
            🪪 Über SSI anmelden
          </button>
        </div>
      </div>
    </div>
  );
}
