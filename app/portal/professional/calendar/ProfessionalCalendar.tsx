"use client";

import { useEffect, useState } from "react";

import { CalendarBlank } from "@/components/ui/Icon";

interface AvailabilityRule {
  id: string;
  rrule: string;
  startTime: string;
  endTime: string;
  timezone: string;
  active: boolean;
}

interface AvailabilityException {
  id: string;
  date: string;
  isAvailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}

interface AvailabilitySlot {
  startAt: string;
  endAt: string;
}

export function ProfessionalCalendar() {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [ruleForm, setRuleForm] = useState({
    rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    startTime: "09:00",
    endTime: "18:00",
    timezone: "America/Bogota",
  });
  const [exceptionForm, setExceptionForm] = useState({
    date: "",
    isAvailable: false,
    startTime: "",
    endTime: "",
    reason: "",
  });

  const loadAvailability = async () => {
    const response = await fetch("/api/professional/availability?range=30");
    if (!response.ok) return;
    const data = (await response.json()) as {
      rules: AvailabilityRule[];
      exceptions: AvailabilityException[];
      slots: AvailabilitySlot[];
    };
    setRules(data.rules ?? []);
    setExceptions(data.exceptions ?? []);
    setSlots(data.slots ?? []);
  };

  useEffect(() => {
    void loadAvailability();
  }, []);

  const createRule = async () => {
    const response = await fetch("/api/professional/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rule", ...ruleForm }),
    });
    if (response.ok) {
      setRuleForm({
        rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
        startTime: "09:00",
        endTime: "18:00",
        timezone: "America/Bogota",
      });
      void loadAvailability();
    }
  };

  const createException = async () => {
    const response = await fetch("/api/professional/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "exception", ...exceptionForm }),
    });
    if (response.ok) {
      setExceptionForm({ date: "", isAvailable: false, startTime: "", endTime: "", reason: "" });
      void loadAvailability();
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Calendar</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Availability rules</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Recurring rules</h2>
          <div className="mt-4 space-y-3 text-sm">
            <input
              value={ruleForm.rrule}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, rrule: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              placeholder="RRULE"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <input
                type="time"
                value={ruleForm.startTime}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              />
              <input
                type="time"
                value={ruleForm.endTime}
                onChange={(event) => setRuleForm((prev) => ({ ...prev, endTime: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
            <input
              value={ruleForm.timezone}
              onChange={(event) => setRuleForm((prev) => ({ ...prev, timezone: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              placeholder="Timezone"
            />
            <button
              type="button"
              onClick={createRule}
              className="w-full rounded-2xl border border-brand-indigo px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-indigo"
            >
              Save rule
            </button>
          </div>
          <div className="mt-6 space-y-2">
            {rules.length === 0 ? (
              <p className="text-sm text-slate-500">No rules defined yet.</p>
            ) : (
              rules.map((rule) => (
                <div key={rule.id} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">{rule.rrule}</p>
                  <p className="text-slate-500">
                    {rule.startTime} - {rule.endTime} ({rule.timezone})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Exceptions</h2>
          <div className="mt-4 space-y-3 text-sm">
            <input
              type="date"
              value={exceptionForm.date}
              onChange={(event) => setExceptionForm((prev) => ({ ...prev, date: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
            />
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={exceptionForm.isAvailable}
                onChange={(event) => setExceptionForm((prev) => ({ ...prev, isAvailable: event.target.checked }))}
                className="h-4 w-4 rounded-sm border-slate-300"
              />
              Available exception
            </label>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                type="time"
                value={exceptionForm.startTime}
                onChange={(event) => setExceptionForm((prev) => ({ ...prev, startTime: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              />
              <input
                type="time"
                value={exceptionForm.endTime}
                onChange={(event) => setExceptionForm((prev) => ({ ...prev, endTime: event.target.value }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
            <input
              value={exceptionForm.reason}
              onChange={(event) => setExceptionForm((prev) => ({ ...prev, reason: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
              placeholder="Reason"
            />
            <button
              type="button"
              onClick={createException}
              className="w-full rounded-2xl border border-brand-indigo px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-indigo"
            >
              Save exception
            </button>
          </div>
          <div className="mt-6 space-y-2">
            {exceptions.length === 0 ? (
              <p className="text-sm text-slate-500">No exceptions added yet.</p>
            ) : (
              exceptions.map((exception) => (
                <div key={exception.id} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {new Date(exception.date).toLocaleDateString("es-CO")} {exception.isAvailable ? "Available" : "Off"}
                  </p>
                  <p className="text-slate-500">{exception.reason ?? ""}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <CalendarBlank size={20} className="text-slate-400" />
          <h2 className="text-lg font-semibold">Next 30 days preview</h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {slots.length === 0 ? (
            <p className="text-sm text-slate-500">No availability generated yet.</p>
          ) : (
            slots.map((slot) => (
              <div key={`${slot.startAt}-${slot.endAt}`} className="rounded-2xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {new Date(slot.startAt).toLocaleDateString("es-CO")}
                </p>
                <p className="text-slate-500">
                  {new Date(slot.startAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} -
                  {" "}
                  {new Date(slot.endAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
