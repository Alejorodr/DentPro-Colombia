"use client";

import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

export type BookingFormStatus = "idle" | "pending" | "success" | "error";

interface UseBookingFormOptions {
  onSuccess?: () => void;
}

export function useBookingForm({ onSuccess }: UseBookingFormOptions = {}) {
  const router = useRouter();
  const [status, setStatus] = useState<BookingFormStatus>("idle");

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setStatus("pending");

      const form = event.currentTarget;
      const dateInput = form.elements.namedItem("preferredDate") as HTMLInputElement | null;
      const date = dateInput?.value?.trim();

      const bookingPath = date
        ? `/portal/client/book?date=${encodeURIComponent(date)}`
        : "/portal/client/book";

      router.push(`/auth/login?callbackUrl=${encodeURIComponent(bookingPath)}`);
      onSuccess?.();
    },
    [router, onSuccess],
  );

  return {
    handleSubmit,
    status,
    isSuccess: status === "success",
    isPending: status === "pending",
    error: null,
  };
}
