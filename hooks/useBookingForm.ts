"use client";

import { useCallback } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { createAppointmentRequest } from "@/lib/api/appointments";

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

export function useBookingForm({ onSuccess }: UseBookingFormOptions = {}) {
  const mutation = useMutation({
    mutationFn: createAppointmentRequest,
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

      mutation.mutate(payload, {
        onSuccess: () => {
          form.reset();
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
    error: mutation.error,
  };
}
