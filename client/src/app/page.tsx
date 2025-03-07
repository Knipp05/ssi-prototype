"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Home() {
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    async function fetchQrCode() {
      try {
        const res = await fetch("http://172.18.64.1:3001/generate-qr");
        if (!res.ok) {
          throw new Error("Fehler beim Abrufen des QR Code");
        }
        const resData = await res.json();
        setQrCode(resData.qrCode);
      } catch {
        console.error("Fehler");
      }
    }
    fetchQrCode();
  }, []);

  return (
    <div>
      <h1>Musterstudienportal</h1>
      <input placeholder="Benutzername"></input>
      <input placeholder="Passwort"></input>
      <button>anmelden</button>
      <div>Alternativ über Wallet anmelden</div>
      {qrCode && (
        <Image
          alt="QR Code für SSI Login"
          src={qrCode}
          width="480"
          height="480"
        />
      )}
    </div>
  );
}
