"use client";

import { useState } from "react";

import { roleLabels, userRoles, type UserRole } from "@/lib/auth/roles";
import { fetchWithTimeout } from "@/lib/http";
import { STATUS_COLORS } from "@/app/portal/components/ui/statusColors";

export type Specialty = {
  id: string;
  name: string;
  defaultSlotDurationMinutes: number;
  active: boolean;
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
