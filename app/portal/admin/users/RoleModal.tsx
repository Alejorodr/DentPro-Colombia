"use client";

import { useEffect, useState } from "react";

import { roleLabels, userRoles, type UserRole } from "@/lib/auth/roles";
import { fetchWithTimeout } from "@/lib/http";
import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";

export type Specialty = {
  id: string;
  name: string;
  defaultSlotDurationMinutes: number;
  active: boolean;
};

type Service = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number | null;
  active: boolean;
  specialtyId: string | null;
};

type Assignment = {
  id: string;
  serviceId: string;
  active: boolean;
  onlineBookable: boolean;
};

export type RoleModalUser = {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: UserRole;
  professional?: { id: string; specialty?: { id: string; name: string } | null } | null;
};

type SaveStatus = "idle" | "loading" | "done" | "error";

export function RoleModal({
  user,
  specialties,
  roleLock,
  onClose,
  onSaved,
  onSpecialtyCreated,
}: {
  user: RoleModalUser;
  specialties: Specialty[];
  roleLock?: UserRole;
  onClose: () => void;
  onSaved: () => void;
  onSpecialtyCreated: (specialty: Specialty) => void;
}) {
  const [role, setRole] = useState<UserRole>(roleLock ?? user.role);
  const [specialtyId, setSpecialtyId] = useState(user.professional?.specialty?.id ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showCreateSpecialty, setShowCreateSpecialty] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState("");
  const [newSpecialtyDuration, setNewSpecialtyDuration] = useState("");
  const [creatingSpecialty, setCreatingSpecialty] = useState(false);
  const [createSpecialtyError, setCreateSpecialtyError] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const professionalId = user.professional?.id;

  useEffect(() => {
    if (!professionalId || role !== "PROFESIONAL") return;

    let cancelled = false;
    setServicesLoading(true);

    void (async () => {
      try {
        const [servicesResponse, assignmentsResponse] = await Promise.all([
          fetchWithTimeout("/api/services?pageSize=100"),
          fetchWithTimeout(`/api/admin/scheduling?professionalId=${professionalId}`),
        ]);

        if (cancelled) return;

        if (servicesResponse.ok) {
          const body = (await servicesResponse.json()) as { data: Service[] };
          setServices(body.data ?? []);
        }
        if (assignmentsResponse.ok) {
          const body = (await assignmentsResponse.json()) as { assignments: Assignment[] };
          setAssignments(body.assignments ?? []);
        }
        if (!servicesResponse.ok || !assignmentsResponse.ok) {
          setAssignmentError("No pudimos cargar los servicios de esta especialidad.");
        }
      } catch {
        if (!cancelled) {
          setAssignmentError("No pudimos conectar con el servidor. Intenta de nuevo.");
        }
      } finally {
        if (!cancelled) {
          setServicesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [professionalId, role]);

  const requiresSpecialty = role === "PROFESIONAL";
  const canSave = !requiresSpecialty || specialtyId.length > 0;

  const handleSave = async () => {
    if (!canSave) {
      setErrorMsg("Selecciona una especialidad para el profesional.");
      return;
    }

    setStatus("loading");
    setErrorMsg(null);

    try {
      const response = await fetchWithTimeout(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          specialtyId: role === "PROFESIONAL" ? specialtyId : undefined,
        }),
      });

      if (response.ok) {
        setStatus("done");
        onSaved();
      } else {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setErrorMsg(body?.error ?? "No pudimos guardar el rol.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("No pudimos conectar con el servidor. Intenta de nuevo.");
      setStatus("error");
    }
  };

  const handleCreateSpecialty = async () => {
    if (!newSpecialtyName.trim() || !newSpecialtyDuration.trim()) {
      setCreateSpecialtyError("Nombre y duración son obligatorios.");
      return;
    }

    setCreatingSpecialty(true);
    setCreateSpecialtyError(null);

    try {
      const response = await fetchWithTimeout("/api/specialties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSpecialtyName.trim(),
          defaultSlotDurationMinutes: Number(newSpecialtyDuration),
        }),
      });

      if (response.ok) {
        const created = (await response.json()) as Specialty;
        onSpecialtyCreated(created);
        setSpecialtyId(created.id);
        setShowCreateSpecialty(false);
        setNewSpecialtyName("");
        setNewSpecialtyDuration("");
      } else {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setCreateSpecialtyError(body?.error ?? "No pudimos crear la especialidad.");
      }
    } catch {
      setCreateSpecialtyError("No pudimos conectar con el servidor. Intenta de nuevo.");
    }

    setCreatingSpecialty(false);
  };

  const toggleServiceAssignment = async (service: Service, field: "active" | "onlineBookable") => {
    if (!professionalId) return;

    const existing = assignments.find((a) => a.serviceId === service.id);
    setAssignmentSaving(service.id);
    setAssignmentError(null);

    try {
      const response = existing
        ? await fetchWithTimeout("/api/admin/scheduling", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "updateAssignment",
              assignmentId: existing.id,
              active: field === "active" ? !existing.active : existing.active,
              onlineBookable: field === "onlineBookable" ? !existing.onlineBookable : existing.onlineBookable,
            }),
          })
        : await fetchWithTimeout("/api/admin/scheduling", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "createAssignment",
              professionalId,
              serviceId: service.id,
              onlineBookable: field === "onlineBookable",
            }),
          });

      if (response.ok) {
        const body = (await response.json()) as { assignment: Assignment };
        setAssignments((prev) => {
          const withoutCurrent = prev.filter((a) => a.serviceId !== service.id);
          return [...withoutCurrent, body.assignment];
        });
      } else {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setAssignmentError(body?.error ?? "No pudimos actualizar el servicio.");
      }
    } catch {
      setAssignmentError("No pudimos conectar con el servidor. Intenta de nuevo.");
    }

    setAssignmentSaving(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usuarios</p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Cambiar rol · {user.name} {user.lastName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-surface-muted"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rol</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_COLORS.Active.badge}`}
              >
                Actual: {roleLabels[user.role]}
              </span>
            </div>
            {roleLock ? (
              <div className="input mt-2 flex h-11 items-center text-sm text-slate-600 dark:text-slate-300">
                {roleLabels[roleLock]}
              </div>
            ) : (
              <select
                className="input mt-2 h-11 text-sm"
                value={role}
                onChange={(event) => {
                  setRole(event.target.value as UserRole);
                  setStatus("idle");
                }}
                disabled={status === "loading"}
              >
                {userRoles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
            )}
          </section>

          {role === "PROFESIONAL" ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Especialidad
              </p>
              <select
                className="input mt-2 h-11 text-sm"
                value={specialtyId}
                onChange={(event) => setSpecialtyId(event.target.value)}
                disabled={status === "loading"}
              >
                <option value="">Selecciona una especialidad</option>
                {specialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </option>
                ))}
              </select>

              {showCreateSpecialty ? (
                <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-surface-muted">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="input h-10 text-sm"
                      placeholder="Nombre"
                      value={newSpecialtyName}
                      onChange={(event) => setNewSpecialtyName(event.target.value)}
                      disabled={creatingSpecialty}
                    />
                    <input
                      className="input h-10 text-sm"
                      placeholder="Duración base (min)"
                      value={newSpecialtyDuration}
                      onChange={(event) => setNewSpecialtyDuration(event.target.value)}
                      disabled={creatingSpecialty}
                    />
                  </div>
                  {createSpecialtyError ? (
                    <p className="text-xs text-red-600 dark:text-red-400">{createSpecialtyError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-brand-teal px-3 py-1.5 text-xs font-semibold uppercase text-white disabled:opacity-60"
                      onClick={() => void handleCreateSpecialty()}
                      disabled={creatingSpecialty}
                    >
                      {creatingSpecialty ? "Creando..." : "Crear"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
                      onClick={() => setShowCreateSpecialty(false)}
                      disabled={creatingSpecialty}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-brand-teal hover:underline dark:text-accent-cyan"
                  onClick={() => setShowCreateSpecialty(true)}
                >
                  + Crear especialidad
                </button>
              )}
            </section>
          ) : null}

          {role === "PROFESIONAL" && professionalId && specialtyId ? (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Servicios que ofrece
              </p>
              {servicesLoading ? (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Cargando servicios...</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {services
                    .filter((service) => service.specialtyId === specialtyId)
                    .map((service) => {
                      const assignment = assignments.find((a) => a.serviceId === service.id);
                      const isActive = assignment?.active ?? false;
                      const isBookable = assignment?.onlineBookable ?? false;
                      const isSaving = assignmentSaving === service.id;
                      return (
                        <div
                          key={service.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-surface-muted"
                        >
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{service.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(service.priceCents / 100)}
                              {service.durationMinutes ? ` · ${service.durationMinutes} min` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => void toggleServiceAssignment(service, "active")}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                                isActive
                                  ? STATUS_COLORS.Active.border + " " + STATUS_COLORS.Active.text
                                  : STATUS_COLORS.Inactive.border + " " + STATUS_COLORS.Inactive.text
                              }`}
                            >
                              {isActive ? "Activo" : "Inactivo"}
                            </button>
                            <button
                              type="button"
                              disabled={isSaving || !isActive}
                              onClick={() => void toggleServiceAssignment(service, "onlineBookable")}
                              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase disabled:opacity-40 ${
                                isBookable
                                  ? "border-brand-teal text-brand-teal"
                                  : "border-slate-200 text-slate-500 dark:border-surface-muted dark:text-slate-400"
                              }`}
                            >
                              {isBookable ? "Reservable online" : "No reservable online"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {services.filter((service) => service.specialtyId === specialtyId).length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No hay servicios cargados para esta especialidad todavía.
                    </p>
                  ) : null}
                </div>
              )}
              {assignmentError ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{assignmentError}</p> : null}
            </section>
          ) : null}

          {errorMsg ? <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p> : null}
          {status === "done" ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Rol actualizado correctamente.</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted dark:text-slate-200"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || status === "loading"}
              className="rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase text-white disabled:opacity-50"
            >
              {status === "loading" ? "Guardando..." : "Guardar rol"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
