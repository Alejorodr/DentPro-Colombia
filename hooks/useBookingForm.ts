"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";

export type BookingFormStatus = "idle" | "pending" | "success" | "error";

interface UseBookingFormOptions {
  onSuccess?: () => void;
}

export function useBookingForm({ onSuccess }: UseBookingFormOptions = {}) {
  const [status, setStatus] = useState<BookingFormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus("error");
      setErrorMessage("Para crear un turno inicia sesión y utiliza el formulario en /appointments/new.");
      onSuccess?.();
    },
    [onSuccess],
  );

  return {
    handleSubmit,
    status,
    isSuccess: status === "success",
    isPending: status === "pending",
    error: errorMessage,
  };
}
