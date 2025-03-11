"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useAuthRedirect() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.log("❌ Kein Auth-Token gefunden. Weiterleitung zum Login...");
      router.push("/");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  return isAuthenticated;
}
