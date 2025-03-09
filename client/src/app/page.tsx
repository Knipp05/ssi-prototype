"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <div>
      <h1>Musterstudienportal</h1>
      <input placeholder="Benutzername"></input>
      <input placeholder="Passwort"></input>
      <button>anmelden</button>
      <button onClick={() => router.push("/ssi-login")}>
        Über SSI anmelden
      </button>
    </div>
  );
}
