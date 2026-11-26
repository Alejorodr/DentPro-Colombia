"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { Table } from "@/app/portal/components/ui/Table";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";
import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { SkeletonRows } from "@/app/portal/components/ui/Skeleton";
import { PortalDialog } from "@/app/portal/components/ui/PortalDialog";
import { CLINIC_TIME_ZONE } from "@/lib/dates/tz";

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(cents / 100);

const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Cobrado",
  WAIVED: "Exonerado",
};

const paymentStatusStyle: Record<PaymentStatus, string> = {
  PENDING: "border-slate-300 bg-slate-100 text-slate-700 dark:border-surface-muted dark:bg-surface-muted dark:text-slate-300",
  PAID: "border-brand-teal/30 bg-brand-light text-brand-teal dark:border-accent-cyan/30 dark:bg-accent-cyan/15 dark:text-accent-cyan",
  WAIVED: "border-slate-200 bg-slate-50 text-slate-500 dark:border-surface-muted dark:bg-surface-base/60 dark:text-slate-400",
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

type ReceptionistBillingProps = {
  /**
   * Only ADMINISTRADOR may revert a PAID payment or record an amount below the
   * service price (enforced by /api/appointments/[id]/payment). The UI mirrors
   * those rules so receptionists are not offered actions the server rejects.
   */
  isAdmin?: boolean;
};

export function ReceptionistBilling({ isAdmin = false }: ReceptionistBillingProps) {
  const [selectedDate, setSelectedDate] = useState(() => formatDateInput(new Date()));
  const [data, setData] = useState<BillingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [payTarget, setPayTarget] = useState<AppointmentBilling | null>(null);
  const [payForm, setPayForm] = useState<PayForm>({ paymentStatus: PaymentStatus.PAID, paymentMethod: PaymentMethod.CASH, paidAmountCents: "" });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);

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

  const isAmountLocked = (appointment: AppointmentBilling) => !isAdmin && appointment.servicePriceCents != null;

  const openPayModal = (appointment: AppointmentBilling) => {
    setPayTarget(appointment);
    setPayForm({
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: appointment.paymentMethod ?? "",
      paidAmountCents: isAmountLocked(appointment)
        ? String((appointment.servicePriceCents ?? 0) / 100)
        : appointment.paidAmountCents != null
          ? String(appointment.paidAmountCents / 100)
          : appointment.servicePriceCents != null
            ? String(appointment.servicePriceCents / 100)
            : "",
    });
    setFeedback(null);
    setConflict(false);
  };

  const reloadAfterConflict = () => {
    setPayTarget(null);
    setFeedback(null);
    setConflict(false);
    void load(selectedDate);
  };

  const submitPayment = async () => {
    if (!payTarget) return;
    setSaving(true);
    setFeedback(null);
    setConflict(false);
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
        if (response.status === 409) {
          setConflict(true);
          setFeedback(body?.error ?? "El cobro fue modificado por otra persona. Recarga e intenta de nuevo.");
        } else {
          setFeedback(body?.error ?? "No se pudo registrar el cobro.");
        }
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
              <p className="mt-2 text-2xl font-semibold text-brand-teal dark:text-accent-cyan">
                {formatCurrency(data.summary.totalBilledCents)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{data.summary.paidCount} citas</p>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pendiente por cobrar</p>
              <p className="mt-2 text-2xl font-semibold text-slate-600 dark:text-slate-300">
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
              <p className="text-xs text-slate-500">Citas en sala o completadas · {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("es-CO", { timeZone: CLINIC_TIME_ZONE, weekday: "long", day: "numeric", month: "long" })}</p>
            </div>

            {loading ? (
              <SkeletonRows label="Cargando" />
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
                        {new Date(appointment.startAt).toLocaleTimeString("es-CO", { timeZone: CLINIC_TIME_ZONE, hour: "2-digit", minute: "2-digit" })}
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
        <PortalDialog onClose={() => setPayTarget(null)} labelledBy="pay-modal-title" size="md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Registrar cobro</p>
          <h3 id="pay-modal-title" className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{payTarget.patientName}</h3>
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
                {/* Reverting a PAID payment is ADMINISTRADOR-only. */}
                {isAdmin || payTarget.paymentStatus !== PaymentStatus.PAID ? (
                  <>
                    <option value={PaymentStatus.PENDING}>Pendiente</option>
                    <option value={PaymentStatus.WAIVED}>Exonerado</option>
                  </>
                ) : null}
              </select>
              {!isAdmin && payTarget.paymentStatus === PaymentStatus.PAID ? (
                <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">
                  Solo un administrador puede revertir un pago registrado.
                </span>
              ) : null}
            </label>

            {payForm.paymentStatus === PaymentStatus.PAID && (
              <>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Método de pago
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-700 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200"
                    value={payForm.paymentMethod}
                    onChange={(event) => setPayForm((prev) => ({ ...prev, paymentMethod: event.target.value as PaymentMethod | "" }))}
                  >
                    <option value="">Selecciona un método</option>
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
                    max={payTarget.servicePriceCents != null ? payTarget.servicePriceCents / 100 : undefined}
                    step={1000}
                    readOnly={isAmountLocked(payTarget)}
                    aria-readonly={isAmountLocked(payTarget)}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-700 read-only:cursor-not-allowed read-only:bg-slate-50 read-only:text-slate-500 dark:border-surface-muted dark:bg-surface-base dark:text-slate-200 dark:read-only:bg-surface-muted/40"
                    value={payForm.paidAmountCents}
                    onChange={(event) => setPayForm((prev) => ({ ...prev, paidAmountCents: event.target.value }))}
                    placeholder={payTarget.servicePriceCents != null ? String(payTarget.servicePriceCents / 100) : "0"}
                  />
                  {isAmountLocked(payTarget) ? (
                    <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-400">
                      El monto corresponde a la tarifa del servicio. Solo un administrador puede registrar un descuento.
                    </span>
                  ) : null}
                </label>
              </>
            )}
          </div>

          {feedback ? (
            <div className="mt-3 text-sm text-rose-600" role="alert">
              <p>{feedback}</p>
              {conflict ? (
                <button
                  type="button"
                  onClick={reloadAfterConflict}
                  className="mt-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
                >
                  Recargar cobros
                </button>
              ) : null}
            </div>
          ) : null}

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
              disabled={saving || (payForm.paymentStatus === PaymentStatus.PAID && !payForm.paymentMethod)}
              className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </PortalDialog>
      ) : null}
    </div>
  );
}
