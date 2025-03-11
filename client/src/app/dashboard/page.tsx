"use client";
import { useAuthRedirect } from "../auth";

export default function Dashboard() {
  const isAuthenticated = useAuthRedirect();

  function logout() {
    localStorage.removeItem("authToken");
    window.location.href = "/"; // Zurück zur Login-Seite
  }

  if (!isAuthenticated) return null; // Verhindert das Rendern vor Auth-Check

  return (
    <div>
      <h1>📚 Geschütztes Dashboard</h1>
      <p>Willkommen im Studienportal!</p>

      <button
        onClick={logout}
        className="px-4 py-2 bg-red-500 text-white rounded-lg"
      >
        🚪 Abmelden
      </button>
    </div>
  );
}
