"use client";

import { useEffect, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type Professional = { id: string; user: { name: string; lastName: string } };
type Service = { id: string; name: string };
type Assignment = {
  id: string;
  professional: { user: { name: string; lastName: string } };
  service: { name: string };
  active: boolean;
  onlineBookable: boolean;
};
type Schedule = {
  id: string;
  professional: { user: { name: string; lastName: string } };
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  status: string;
};

const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function AdminSchedulingPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [assignmentForm, setAssignmentForm] = useState({ professionalId: "", serviceId: "", onlineBookable: true });
  const [scheduleForm, setScheduleForm] = useState({ professionalId: "", dayOfWeek: "1", startTime: "09:00", endTime: "18:00" });

  const loadData = async () => {
    setError(null);
    const [profRes, servicesRes, schedulingRes] = await Promise.all([
      fetchWithRetry("/api/professionals?pageSize=100"),
      fetchWithRetry("/api/services?active=true&pageSize=100"),
      fetchWithRetry("/api/admin/scheduling"),
    ]);

    if (!profRes.ok || !servicesRes.ok || !schedulingRes.ok) {
      setError("No se pudo cargar la configuración operativa.");
      return;
    }

    const profData = (await profRes.json()) as { data: Professional[] };
    const servicesData = (await servicesRes.json()) as { data: Service[] };
    const schedulingData = (await schedulingRes.json()) as { assignments: Assignment[]; schedules: Schedule[] };

    setProfessionals(profData.data ?? []);
    setServices(servicesData.data ?? []);
    setAssignments(schedulingData.assignments ?? []);
    setSchedules(schedulingData.schedules ?? []);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const createAssignment = async () => {
    const response = await fetchWithTimeout("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "assignService",
        professionalId: assignmentForm.professionalId,
        serviceId: assignmentForm.serviceId,
        onlineBookable: assignmentForm.onlineBookable,
        active: true,
      }),
    });

    if (response.ok) {
      await loadData();
    } else {
      setError("No se pudo guardar la asignación de servicio.");
    }
  };

  const createSchedule = async () => {
    const response = await fetchWithTimeout("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "upsertWorkingSchedule",
        professionalId: scheduleForm.professionalId,
        dayOfWeek: Number(scheduleForm.dayOfWeek),
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
      }),
    });

    if (response.ok) {
      await loadData();
    } else {
      setError("No se pudo crear el horario base.");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Operación</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Scheduling clínico</h1>
      </header>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
          <h2 className="text-lg font-semibold">Asignar servicios a profesionales</h2>
          <div className="mt-3 grid gap-2">
            <select className="input" value={assignmentForm.professionalId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, professionalId: event.target.value }))}>
              <option value="">Selecciona profesional</option>
              {professionals.map((prof) => <option key={prof.id} value={prof.id}>{prof.user.name} {prof.user.lastName}</option>)}
            </select>
            <select className="input" value={assignmentForm.serviceId} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, serviceId: event.target.value }))}>
              <option value="">Selecciona servicio</option>
              {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
            </select>
            <label className="text-sm"><input type="checkbox" checked={assignmentForm.onlineBookable} onChange={(event) => setAssignmentForm((prev) => ({ ...prev, onlineBookable: event.target.checked }))} /> Disponible para reserva online</label>
            <button className="btn btn-secondary" type="button" onClick={createAssignment}>Guardar asignación</button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
          <h2 className="text-lg font-semibold">Definir horario base</h2>
          <div className="mt-3 grid gap-2">
            <select className="input" value={scheduleForm.professionalId} onChange={(event) => setScheduleForm((prev) => ({ ...prev, professionalId: event.target.value }))}>
              <option value="">Selecciona profesional</option>
              {professionals.map((prof) => <option key={prof.id} value={prof.id}>{prof.user.name} {prof.user.lastName}</option>)}
            </select>
            <select className="input" value={scheduleForm.dayOfWeek} onChange={(event) => setScheduleForm((prev) => ({ ...prev, dayOfWeek: event.target.value }))}>
              {weekDays.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm((prev) => ({ ...prev, startTime: event.target.value }))} />
              <input className="input" type="time" value={scheduleForm.endTime} onChange={(event) => setScheduleForm((prev) => ({ ...prev, endTime: event.target.value }))} />
            </div>
            <button className="btn btn-secondary" type="button" onClick={createSchedule}>Crear horario base</button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
          <h3 className="font-semibold">Asignaciones activas</h3>
          <div className="mt-3 space-y-2 text-sm">
            {assignments.map((item) => <p key={item.id}>{item.professional.user.name} {item.professional.user.lastName} → {item.service.name} · {item.onlineBookable ? "Online" : "Interno"}</p>)}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
          <h3 className="font-semibold">Horarios base</h3>
          <div className="mt-3 space-y-2 text-sm">
            {schedules.map((item) => <p key={item.id}>{item.professional.user.name} {item.professional.user.lastName} · {weekDays[item.dayOfWeek]} {item.startTime}-{item.endTime} · {item.status}</p>)}
          </div>
        </div>
      </section>
    </div>
  );
}
