"use client";

import { useEffect, useMemo, useState } from "react";

import { roleLabels, userRoles, type UserRole } from "@/lib/auth/roles";

type Specialty = {
  id: string;
  name: string;
};

type UserRecord = {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: UserRole;
  patient?: { phone?: string | null; documentId?: string | null } | null;
  professional?: { id: string; specialty?: { id: string; name: string } | null } | null;
};

type UserDraft = {
  role?: UserRole;
  specialtyId?: string;
};

const defaultFormState = {
  email: "",
  password: "",
  name: "",
  lastName: "",
  role: "PACIENTE" as UserRole,
  phone: "",
  documentId: "",
  specialtyId: "",
  slotDurationMinutes: "",
};

export function AdminUsersPanel() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [formState, setFormState] = useState(defaultFormState);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const requiresSpecialty = formState.role === "PROFESIONAL" && !formState.specialtyId;
    return (
      formState.email.trim().length > 0 &&
      formState.password.trim().length > 0 &&
      formState.name.trim().length > 0 &&
      formState.lastName.trim().length > 0 &&
      !requiresSpecialty &&
      !saving &&
      !loading
    );
  }, [formState, loading, saving]);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      const [usersResponse, specialtiesResponse] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/specialties"),
      ]);

      if (!usersResponse.ok) {
        throw new Error("No pudimos cargar los usuarios.");
      }

      if (!specialtiesResponse.ok) {
        throw new Error("No pudimos cargar las especialidades.");
      }

      const usersJson = (await usersResponse.json()) as UserRecord[];
      const specialtiesJson = (await specialtiesResponse.json()) as Specialty[];
      setUsers(usersJson);
      setSpecialties(specialtiesJson);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreate = async () => {
    if (!canSubmit) {
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      email: formState.email,
      password: formState.password,
      name: formState.name,
      lastName: formState.lastName,
      role: formState.role,
      phone: formState.role === "PACIENTE" ? formState.phone : undefined,
      documentId: formState.role === "PACIENTE" ? formState.documentId : undefined,
      specialtyId: formState.role === "PROFESIONAL" ? formState.specialtyId : undefined,
      slotDurationMinutes:
        formState.role === "PROFESIONAL" && formState.slotDurationMinutes
          ? Number(formState.slotDurationMinutes)
          : undefined,
    };

    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const created = (await response.json()) as UserRecord;
      setUsers((prev) => [created, ...prev]);
      setFormState(defaultFormState);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos crear el usuario.");
    }

    setSaving(false);
  };

  const updateDraft = (id: string, next: UserDraft) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  };

  const applyDraft = async (user: UserRecord) => {
    const draft = drafts[user.id];
    if (!draft || !draft.role) {
      return;
    }

    if (draft.role === "PROFESIONAL" && !(draft.specialtyId ?? user.professional?.specialty?.id)) {
      setError("Selecciona una especialidad para el profesional.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: draft.role,
        specialtyId: draft.role === "PROFESIONAL" ? draft.specialtyId ?? user.professional?.specialty?.id : undefined,
      }),
    });

    if (response.ok) {
      const updated = (await response.json()) as UserRecord;
      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[user.id];
        return next;
      });
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos actualizar el usuario.");
    }

    setSaving(false);
  };

  const resetPassword = async (user: UserRecord) => {
    const newPassword = window.prompt(`Nueva contraseña para ${user.email}`);
    if (!newPassword) {
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos resetear la contraseña.");
    }

    setSaving(false);
  };

  const deleteUser = async (user: UserRecord) => {
    if (!window.confirm(`¿Eliminar a ${user.email}?`)) {
      return;
    }

    setSaving(true);
    setError(null);
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });

    if (response.ok) {
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos eliminar el usuario.");
    }

    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Crear usuario</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">Define el rol y las credenciales iniciales.</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input
            className="input h-11 text-sm"
            placeholder="Nombre"
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            placeholder="Apellido"
            value={formState.lastName}
            onChange={(event) => setFormState((prev) => ({ ...prev, lastName: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            type="email"
            placeholder="Correo"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            disabled={saving}
          />
          <input
            className="input h-11 text-sm"
            type="password"
            placeholder="Contraseña"
            value={formState.password}
            onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
            disabled={saving}
          />
          <select
            className="input h-11 text-sm"
            value={formState.role}
            onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value as UserRole }))}
            disabled={saving}
          >
            {userRoles.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
          {formState.role === "PROFESIONAL" ? (
            <select
              className="input h-11 text-sm"
              value={formState.specialtyId}
              onChange={(event) => setFormState((prev) => ({ ...prev, specialtyId: event.target.value }))}
              disabled={saving}
            >
              <option value="">Especialidad</option>
              {specialties.map((specialty) => (
                <option key={specialty.id} value={specialty.id}>
                  {specialty.name}
                </option>
              ))}
            </select>
          ) : null}
          {formState.role === "PROFESIONAL" ? (
            <input
              className="input h-11 text-sm"
              placeholder="Duración slot (min)"
              value={formState.slotDurationMinutes}
              onChange={(event) => setFormState((prev) => ({ ...prev, slotDurationMinutes: event.target.value }))}
              disabled={saving}
            />
          ) : null}
          {formState.role === "PACIENTE" ? (
            <input
              className="input h-11 text-sm"
              placeholder="Teléfono"
              value={formState.phone}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
              disabled={saving}
            />
          ) : null}
          {formState.role === "PACIENTE" ? (
            <input
              className="input h-11 text-sm"
              placeholder="Documento"
              value={formState.documentId}
              onChange={(event) => setFormState((prev) => ({ ...prev, documentId: event.target.value }))}
              disabled={saving}
            />
          ) : null}
        </div>

        <button
          type="button"
          className="mt-4 rounded-full bg-brand-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-60"
          onClick={handleCreate}
          disabled={!canSubmit}
        >
          Crear usuario
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Usuarios</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Administra roles y accesos.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
            onClick={loadData}
            disabled={loading}
          >
            Recargar
          </button>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando usuarios...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {users.map((user) => {
              const draft = drafts[user.id] ?? {};
              const selectedRole = draft.role ?? user.role;
              return (
                <div
                  key={user.id}
                  className="rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-surface-muted/70 dark:bg-surface-base/60"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {user.name} {user.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Rol actual: {roleLabels[user.role]}{" "}
                        {user.professional?.specialty?.name ? `· ${user.professional.specialty.name}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="input h-9 text-xs"
                        value={selectedRole}
                        onChange={(event) =>
                          updateDraft(user.id, { role: event.target.value as UserRole, specialtyId: "" })
                        }
                        disabled={saving}
                      >
                        {userRoles.map((role) => (
                          <option key={role} value={role}>
                            {roleLabels[role]}
                          </option>
                        ))}
                      </select>
                      {selectedRole === "PROFESIONAL" ? (
                        <select
                          className="input h-9 text-xs"
                          value={draft.specialtyId ?? user.professional?.specialty?.id ?? ""}
                          onChange={(event) => updateDraft(user.id, { specialtyId: event.target.value })}
                          disabled={saving}
                        >
                          <option value="">Especialidad</option>
                          {specialties.map((specialty) => (
                            <option key={specialty.id} value={specialty.id}>
                              {specialty.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-full border border-brand-teal px-3 py-1 text-xs font-semibold uppercase text-brand-teal"
                        onClick={() => applyDraft(user)}
                        disabled={saving || !draft.role}
                      >
                        Guardar rol
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
                        onClick={() => resetPassword(user)}
                        disabled={saving}
                      >
                        Resetear password
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold uppercase text-red-600"
                        onClick={() => deleteUser(user)}
                        disabled={saving}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
