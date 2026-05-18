"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { Table } from "@/app/portal/components/ui/Table";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cents / 100);

const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Cobrado",
  WAIVED: "Exonerado",
};

const paymentStatusStyle: Record<PaymentStatus, string> = {
  PENDING: "border-amber-200 bg-amber-100 text-amber-800",
  PAID: "border-emerald-200 bg-emerald-100 text-emerald-800",
  WAIVED: "border-slate-200 bg-slate-100 text-slate-600",
};

const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

type AppointmentBilling = {
  id: string;
  patientName: string;
  patientCode?: string | null;
  professionalName: string;
  serviceName: string;
  servicePriceCents: number | null;
  startAt: string;
  status: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paidAmountCents: number | null;
  paidAt: string | null;
};

type BillingSummary = {
  totalBilledCents: number;
  totalPendingCents: number;
  count: number;
  paidCount: number;
  pendingCount: number;
  byMethod: Record<PaymentMethod, number>;
};

type BillingResponse = {
  date: string;
  summary: BillingSummary;
  appointments: AppointmentBilling[];
};

type PayForm = {
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | "";
  paidAmountCents: string;
};

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function ReceptionistBilling() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateInput(new Date()));
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [payTarget, setPayTarget] = useState<AppointmentBilling | null>(null);
  const [payForm, setPayForm] = useState<PayForm>({ paymentStatus: PaymentStatus.PAID, paymentMethod: PaymentMethod.CASH, paidAmountCents: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const response = await fetchWithRetry(`/api/receptionist/billing?date=${date}`);
      if (response.ok) {
        setData((await response.json()) as BillingResponse);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedDate);
  }, [load, selectedDate]);

  const openPayModal = (appointment: AppointmentBilling) => {
    setPayTarget(appointment);
    setPayForm({
      paymentStatus: appointment.paymentStatus === PaymentStatus.PAID ? PaymentStatus.PAID : PaymentStatus.PAID,
      paymentMethod: appointment.paymentMethod ?? PaymentMethod.CASH,
      paidAmountCents: appointment.paidAmountCents != null
        ? String(appointment.paidAmountCents / 100)
        : appointment.servicePriceCents != null
          ? String(appointment.servicePriceCents / 100)
          : "",
    });
    setFeedback(null);
  };

  const submitPayment = async () => {
    if (!payTarget) return;
    setSaving(true);
    setFeedback(null);
    try {
      const amountCents = payForm.paidAmountCents
        ? Math.round(parseFloat(payForm.paidAmountCents) * 100)
        : undefined;
      const response = await fetchWithTimeout(`/api/appointments/${payTarget.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: payForm.paymentStatus,
          paymentMethod: payForm.paymentMethod || undefined,
          paidAmountCents: amountCents,
        }),
      });
      if (response.ok) {
        setPayTarget(null);
        void load(selectedDate);
      } else {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setFeedback(body?.error ?? "No se pudo registrar el cobro.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Facturación</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Cobros del día</h1>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-500 shadow-xs dark:border-surface-muted dark:bg-surface-base">
          Fecha
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-600 outline-hidden dark:text-slate-200"
          />
        </label>
      </section>

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total cobrado</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(data.summary.totalBilledCents)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{data.summary.paidCount} citas</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pendiente por cobrar</p>
              <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {formatCurrency(data.summary.totalPendingCents)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{data.summary.pendingCount} citas</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Efectivo</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(data.summary.byMethod.CASH)}
              </p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Tarjeta / Transferencia</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {formatCurrency(data.summary.byMethod.CARD + data.summary.byMethod.TRANSFER)}
              </p>
            </Card>
          </section>

          <Card className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Citas facturables</h2>
              <p className="text-xs text-slate-500">Citas en sala o completadas · {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</p>
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Cargando…</p>
            ) : data.appointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No hay citas facturables para este día.
              </div>
            ) : (
              <Table>
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Hora</th>
                    <th className="px-4 py-3 font-semibold">Paciente</th>
                    <th className="px-4 py-3 font-semibold">Servicio</th>
                    <th className="px-4 py-3 font-semibold">Profesional</th>
                    <th className="px-4 py-3 font-semibold">Tarifa</th>
                    <th className="px-4 py-3 font-semibold">Estado pago</th>
                    <th className="px-4 py-3 font-semibold">Método</th>
                    <th className="px-4 py-3 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
                  {data.appointments.map((appointment) => (
                    <tr key={appointment.id} className="bg-white dark:bg-surface-elevated/60">
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        {new Date(appointment.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">{appointment.patientName}</p>
                        <p className="text-xs text-slate-400">#{appointment.patientCode ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">{appointment.serviceName}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{appointment.professionalName}</td>
                      <td className="px-4 py-3">
                        {appointment.servicePriceCents != null
                          ? formatCurrency(appointment.servicePriceCents)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusStyle[appointment.paymentStatus]}`}>
                          {paymentStatusLabel[appointment.paymentStatus]}
                        </span>
                        {appointment.paidAmountCents != null && appointment.paymentStatus === PaymentStatus.PAID && (
                          <p className="mt-1 text-xs text-slate-400">{formatCurrency(appointment.paidAmountCents)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {appointment.paymentMethod ? paymentMethodLabel[appointment.paymentMethod] : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openPayModal(appointment)}
                          className="inline-flex items-center rounded-full border border-brand-teal bg-brand-teal/10 px-3 py-1 text-xs font-semibold uppercase text-brand-teal"
                        >
                          {appointment.paymentStatus === PaymentStatus.PAID ? "Editar cobro" : "Registrar cobro"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </>
      ) : null}

      {payTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registrar cobro</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{payTarget.patientName}</h3>
            <p className="text-sm text-slate-500">{payTarget.serviceName}</p>
            {payTarget.servicePriceCents != null && (
              <p className="mt-1 text-xs text-slate-400">Tarifa: {formatCurrency(payTarget.servicePriceCents)}</p>
            )}

            <div className="mt-5 space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado del pago
                <select
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
                  value={payForm.paymentStatus}
                  onChange={(event) => setPayForm((prev) => ({ ...prev, paymentStatus: event.target.value as PaymentStatus }))}
                >
                  <option value={PaymentStatus.PAID}>Cobrado</option>
                  <option value={PaymentStatus.PENDING}>Pendiente</option>
                  <option value={PaymentStatus.WAIVED}>Exonerado</option>
                </select>
              </label>

              {payForm.paymentStatus === PaymentStatus.PAID && (
                <>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Método de pago
                    <select
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
                      value={payForm.paymentMethod}
                      onChange={(event) => setPayForm((prev) => ({ ...prev, paymentMethod: event.target.value as PaymentMethod }))}
                    >
                      <option value={PaymentMethod.CASH}>Efectivo</option>
                      <option value={PaymentMethod.CARD}>Tarjeta</option>
                      <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                    </select>
                  </label>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Monto cobrado (COP)
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
                      value={payForm.paidAmountCents}
                      onChange={(event) => setPayForm((prev) => ({ ...prev, paidAmountCents: event.target.value }))}
                      placeholder={payTarget.servicePriceCents != null ? String(payTarget.servicePriceCents / 100) : "0"}
                    />
                  </label>
                </>
              )}
            </div>

            {feedback ? <p className="mt-3 text-sm text-rose-600">{feedback}</p> : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPayTarget(null)}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitPayment}
                disabled={saving}
                className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
