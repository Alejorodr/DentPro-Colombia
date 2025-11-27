"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { createAppointmentRequest } from "@/lib/api/appointments";
import type { AppointmentSummary } from "@/lib/api/types";
import type { ApiError } from "@/lib/api/client";

export type BookingFormStatus = "idle" | "pending" | "success" | "error";

export interface BookingFormValues {
  name: string;
  phone: string;
  service: string;
  message: string;
}

interface UseBookingFormOptions {
  onSuccess?: () => void;
}

function getReadableError(error: unknown) {
  if (!error) {
    return "No se pudo enviar la solicitud. Intenta nuevamente.";
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  if (typeof error === "object" && error !== null) {
    const apiError = error as ApiError & { message?: string };

    if (apiError.status === 401) {
      return "Inicia sesión para enviar solicitudes.";
    }

    if (typeof apiError.message === "string" && apiError.message.trim().length > 0) {
      return apiError.message;
    }
  }

  return "No se pudo enviar la solicitud. Intenta nuevamente.";
}

export function useBookingForm({ onSuccess }: UseBookingFormOptions = {}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation<AppointmentSummary, ApiError, BookingFormValues>({
    mutationFn: async (values) => createAppointmentRequest(values),
    onError: (error) => {
      setErrorMessage(getReadableError(error));
    },
  });

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const payload: BookingFormValues = {
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        service: String(formData.get("service") ?? ""),
        message: String(formData.get("message") ?? ""),
      };

      setErrorMessage(null);

      mutation.mutate(payload, {
        onSuccess: () => {
          form.reset();
          setErrorMessage(null);
          onSuccess?.();
        },
      });
    },
    [mutation, onSuccess],
  );

  const status: BookingFormStatus = mutation.status === "idle" ? "idle" : (mutation.status as BookingFormStatus);

  return {
    handleSubmit,
    status,
    isSuccess: mutation.isSuccess,
    isPending: mutation.isPending,
    error: errorMessage,
  };
}

