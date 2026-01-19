"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (process.env.NODE_ENV === "development") {
          console.info("[PWA] Service worker registered", registration);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development") {
          console.info("[PWA] Service worker registration failed", error);
        }
      });
  }, []);

  return null;
}
