"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

type Professional = {
  id: string;
  user: { name: string; lastName: string };
};

type Service = { id: string; name: string; active: boolean };

type Assignment = {
  id: string;
  active: boolean;
  onlineBookable: boolean;
  professionalId: string;
  serviceId: string;
  appointmentDurationMinutes: number | null;
  bufferBeforeMinutes: number | null;
  bufferAfterMinutes: number | null;
  notes: string | null;
  service: { id: string; name: string };
};

type Schedule = {
  id: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  active: boolean;
};

const weekDays = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function normalizeTime(value: string): string {
  if (!value) {
    return "";
  }
  return value.length === 5 ? value : value.slice(0, 5);
}

export default function AdminSchedulingPage() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [serviceIdToAssign, setServiceIdToAssign] = useState("");
  const [onlineBookable, setOnlineBookable] = useState(true);

  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "18:00",
  });

  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const loadBaseData = async () => {
    const [profRes, servicesRes] = await Promise.all([
      fetchWithRetry("/api/professionals?pageSize=100"),
      fetchWithRetry("/api/services?pageSize=100"),
    ]);

    if (!profRes.ok || !servicesRes.ok) {
      setError("No se pudieron cargar profesionales y servicios.");
      return;
    }

    const profData = (await profRes.json()) as { data: Professional[] };
    const servicesData = (await servicesRes.json()) as { data: Service[] };

    const incomingProfessionals = profData.data ?? [];
    setProfessionals(incomingProfessionals);
    setServices((servicesData.data ?? []).filter((service) => service.active));

    if (!selectedProfessionalId && incomingProfessionals.length > 0) {
      setSelectedProfessionalId(incomingProfessionals[0].id);
    }
  };

  const loadProfessionalScheduling = async (professionalId: string) => {
    if (!professionalId) {
      setAssignments([]);
      setSchedules([]);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetchWithRetry(`/api/admin/scheduling?professionalId=${professionalId}`);
    setLoading(false);

    if (!response.ok) {
      setError("No se pudo cargar la configuración de este profesional.");
      return;
    }

    const schedulingData = (await response.json()) as { assignments: Assignment[]; schedules: Schedule[] };
    setAssignments(schedulingData.assignments ?? []);
    setSchedules(schedulingData.schedules ?? []);
  };

  useEffect(() => {
    void loadBaseData();
  }, []);

  useEffect(() => {
    void loadProfessionalScheduling(selectedProfessionalId);
  }, [selectedProfessionalId]);

  const assignedServiceIds = useMemo(() => {
    return new Set(assignments.filter((item) => item.active).map((item) => item.serviceId));
  }, [assignments]);

  const availableServices = useMemo(() => {
    return services.filter((service) => !assignedServiceIds.has(service.id));
  }, [assignedServiceIds, services]);

  const selectedProfessional = professionals.find((item) => item.id === selectedProfessionalId);

  const handleCreateAssignment = async () => {
    if (!selectedProfessionalId || !serviceIdToAssign) {
      setError("Selecciona un profesional y un servicio.");
      return;
    }

    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "createAssignment",
        professionalId: selectedProfessionalId,
        serviceId: serviceIdToAssign,
        onlineBookable,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "No se pudo asignar el servicio.");
      return;
    }

    setSuccess("Servicio asignado correctamente.");
    setServiceIdToAssign("");
    await loadProfessionalScheduling(selectedProfessionalId);
  };

  const handleDeactivateAssignment = async (assignmentId: string) => {
    setError(null);
    setSuccess(null);

    const response = await fetchWithTimeout("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "deactivateAssignment",
        assignmentId,
      }),
    });

    if (!response.ok) {
      setError("No se pudo quitar la asignación.");
      return;
    }

    setSuccess("Asignación desactivada.");
    await loadProfessionalScheduling(selectedProfessionalId);
  };

  const handleToggleOnline = async (assignment: Assignment) => {
    const response = await fetchWithTimeout("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "updateAssignment",
        assignmentId: assignment.id,
        onlineBookable: !assignment.onlineBookable,
      }),
    });

    if (!response.ok) {
      setError("No se pudo actualizar el estado de reserva online.");
      return;
    }

    await loadProfessionalScheduling(selectedProfessionalId);
  };

  const handleCreateSchedule = async () => {
    if (!selectedProfessionalId) {
      setError("Debes seleccionar un profesional.");
      return;
    }

    const payload = {
      type: "createSchedule",
      professionalId: selectedProfessionalId,
      dayOfWeek: Number(scheduleForm.dayOfWeek),
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      timezone: "America/Bogota",
      active: true,
    };

    const response = await fetchWithTimeout("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "No se pudo guardar el horario base.");
      return;
    }

    setSuccess("Horario base guardado.");
    setEditingScheduleId(null);
    await loadProfessionalScheduling(selectedProfessionalId);
  };

  const handleUpdateSchedule = async (schedule: Schedule) => {
    const response = await fetchWithTimeout("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "updateSchedule",
        scheduleId: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        startTime: normalizeTime(schedule.startTime),
        endTime: normalizeTime(schedule.endTime),
        timezone: schedule.timezone,
        active: schedule.active,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "No se pudo actualizar el horario.");
      return;
    }

    setSuccess("Horario actualizado.");
    setEditingScheduleId(null);
    await loadProfessionalScheduling(selectedProfessionalId);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    const response = await fetchWithTimeout("/api/admin/scheduling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "deleteSchedule",
        scheduleId,
      }),
    });

    if (!response.ok) {
      setError("No se pudo eliminar el horario base.");
      return;
    }

    setSuccess("Horario desactivado.");
    await loadProfessionalScheduling(selectedProfessionalId);
  };

  const updateScheduleDraft = (scheduleId: string, key: keyof Schedule, value: string | number | boolean) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.id === scheduleId
          ? {
              ...item,
              [key]: value,
            }
          : item,
      ),
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Operación clínica</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Gestión de agenda base por profesional</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Define qué servicios presta cada profesional y su horario semanal base.
        </p>
      </header>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6">
        <label className="text-sm font-medium text-slate-700" htmlFor="professional-select">
          Profesional
        </label>
        <select
          id="professional-select"
          className="input mt-2"
          value={selectedProfessionalId}
          onChange={(event) => {
            setSelectedProfessionalId(event.target.value);
            setError(null);
            setSuccess(null);
            setServiceIdToAssign("");
          }}
        >
          <option value="">Selecciona profesional</option>
          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>
              {professional.user.name} {professional.user.lastName}
            </option>
          ))}
        </select>
      </section>

      {!selectedProfessional ? (
        <p className="text-sm text-slate-500">Selecciona un profesional para administrar su agenda base.</p>
      ) : (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
            <h2 className="text-lg font-semibold">Servicios asignados</h2>
            <p className="mt-1 text-sm text-slate-600">Controla qué servicios puede agendar este profesional.</p>

            <div className="mt-4 grid gap-2">
              <select className="input" value={serviceIdToAssign} onChange={(event) => setServiceIdToAssign(event.target.value)}>
                <option value="">Selecciona un servicio para agregar</option>
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
              <label className="text-sm text-slate-700">
                <input
                  className="mr-2"
                  type="checkbox"
                  checked={onlineBookable}
                  onChange={(event) => setOnlineBookable(event.target.checked)}
                />
                Permitir reservas online
              </label>
              <button className="btn btn-secondary" type="button" onClick={handleCreateAssignment}>
                Asignar servicio
              </button>
            </div>

            <div className="mt-5 space-y-2 text-sm">
              {assignments.length === 0 ? (
                <p className="text-slate-500">Este profesional aún no tiene servicios asignados.</p>
              ) : (
                assignments.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-800">{assignment.service.name}</p>
                      <p className="text-xs text-slate-500">
                        {assignment.active ? "Activa" : "Inactiva"} · {assignment.onlineBookable ? "Online" : "Solo interno"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {assignment.active ? (
                        <button className="btn btn-ghost" type="button" onClick={() => handleToggleOnline(assignment)}>
                          {assignment.onlineBookable ? "Quitar online" : "Habilitar online"}
                        </button>
                      ) : null}
                      {assignment.active ? (
                        <button className="btn btn-ghost" type="button" onClick={() => handleDeactivateAssignment(assignment.id)}>
                          Desactivar
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
            <h2 className="text-lg font-semibold">Horario semanal base</h2>
            <p className="mt-1 text-sm text-slate-600">Registra los rangos semanales de atención para planificación operativa.</p>

            <div className="mt-4 grid gap-2">
              <select
                className="input"
                value={scheduleForm.dayOfWeek}
                onChange={(event) => setScheduleForm((prev) => ({ ...prev, dayOfWeek: event.target.value }))}
              >
                {weekDays.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  type="time"
                  value={scheduleForm.startTime}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, startTime: event.target.value }))}
                />
                <input
                  className="input"
                  type="time"
                  value={scheduleForm.endTime}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, endTime: event.target.value }))}
                />
              </div>
              <button className="btn btn-secondary" type="button" onClick={handleCreateSchedule}>
                Agregar bloque semanal
              </button>
            </div>

            <div className="mt-5 space-y-2 text-sm">
              {schedules.length === 0 ? (
                <p className="text-slate-500">No hay horarios base configurados.</p>
              ) : (
                schedules.map((schedule) => {
                  const isEditing = editingScheduleId === schedule.id;
                  return (
                    <div key={schedule.id} className="rounded-xl border border-slate-200 p-3">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              className="input"
                              value={schedule.dayOfWeek}
                              onChange={(event) => updateScheduleDraft(schedule.id, "dayOfWeek", Number(event.target.value))}
                            >
                              {weekDays.map((day, index) => (
                                <option key={day} value={index}>
                                  {day}
                                </option>
                              ))}
                            </select>
                            <input
                              className="input"
                              type="time"
                              value={normalizeTime(schedule.startTime)}
                              onChange={(event) => updateScheduleDraft(schedule.id, "startTime", event.target.value)}
                            />
                            <input
                              className="input"
                              type="time"
                              value={normalizeTime(schedule.endTime)}
                              onChange={(event) => updateScheduleDraft(schedule.id, "endTime", event.target.value)}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button className="btn btn-secondary" type="button" onClick={() => void handleUpdateSchedule(schedule)}>
                              Guardar
                            </button>
                            <button className="btn btn-ghost" type="button" onClick={() => setEditingScheduleId(null)}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800">
                              {weekDays[schedule.dayOfWeek]} · {normalizeTime(schedule.startTime)}–{normalizeTime(schedule.endTime)}
                            </p>
                            <p className="text-xs text-slate-500">{schedule.active ? "Activo" : "Inactivo"}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost" type="button" onClick={() => setEditingScheduleId(schedule.id)}>
                              Editar
                            </button>
                            <button className="btn btn-ghost" type="button" onClick={() => void handleDeleteSchedule(schedule.id)}>
                              Desactivar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      )}

      {loading ? <p className="text-sm text-slate-500">Cargando configuración...</p> : null}
    </div>
  );
}
