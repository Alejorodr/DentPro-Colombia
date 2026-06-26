"use client";

import { useEffect, useMemo, useState } from "react";

import { roleLabels, userRoles, type UserRole } from "@/lib/auth/roles";
import { fetchWithRetry, fetchWithTimeout } from "@/lib/http";

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
  active: boolean;
  hasLocalPassword: boolean;
  _isGoogleUser: boolean;
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

interface AdminUsersPanelProps {
  roleFilter?: UserRole;
  roleLock?: UserRole;
}

function ResetPasswordModal({
  userId,
  userEmail,
  onClose,
}: {
  userId: string;
  userEmail: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [password, setPassword] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleReset = async () => {
    setStatus("loading");
    const response = await fetchWithTimeout(`/api/users/${userId}/reset-password`, { method: "POST" });
    if (response.ok) {
      const body = (await response.json()) as { tempPassword: string };
      setPassword(body.tempPassword);
      setStatus("done");
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setErrorMsg(body?.error ?? "No pudimos resetear la contraseña.");
      setStatus("error");
    }
  };

  const handleCopy = () => {
    if (password) {
      void navigator.clipboard.writeText(password).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">Resetear contraseña</h3>
        <p className="mt-1 text-sm text-slate-600">{userEmail}</p>

        {status === "idle" && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">
              Se generará una contraseña temporal. El usuario deberá cambiarla al iniciar sesión.
            </p>
            <button
              type="button"
              className="w-full rounded-full bg-brand-teal py-2 text-sm font-semibold text-white"
              onClick={() => void handleReset()}
            >
              Generar contraseña temporal
            </button>
          </div>
        )}

        {status === "loading" && (
          <p className="mt-4 text-sm text-slate-500">Generando...</p>
        )}

        {status === "done" && password && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Muéstrasela al usuario ahora — no podrás verla de nuevo.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <code className="flex-1 select-all font-mono text-sm text-slate-900">{password}</code>
              <button
                type="button"
                onClick={handleCopy}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <p className="mt-4 text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="button"
          className="mt-4 w-full rounded-full border border-slate-200 py-2 text-sm font-semibold text-slate-600"
          onClick={onClose}
        >
          Listo
        </button>
      </div>
    </div>
  );
}

export function AdminUsersPanel({ roleFilter, roleLock }: AdminUsersPanelProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [formState, setFormState] = useState(() => ({
    ...defaultFormState,
    role: roleLock ?? defaultFormState.role,
  }));
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilterState, setRoleFilterState] = useState<UserRole | "ALL">("ALL");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "active" | "inactive">("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [resetModal, setResetModal] = useState<{ userId: string; userEmail: string } | null>(null);

  const canSubmit = useMemo(() => {
    const effectiveRole = roleLock ?? formState.role;
    const requiresSpecialty = effectiveRole === "PROFESIONAL" && !formState.specialtyId;
    return (
      formState.email.trim().length > 0 &&
      formState.password.trim().length > 0 &&
      formState.name.trim().length > 0 &&
      formState.lastName.trim().length > 0 &&
      !requiresSpecialty &&
      !saving &&
      !loading
    );
  }, [formState, loading, roleLock, saving]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);

      const params = new URLSearchParams({ pageSize: "20", page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const effectiveRoleFilter = roleFilter ?? (roleFilterState !== "ALL" ? roleFilterState : undefined);
      if (effectiveRoleFilter) params.set("role", effectiveRoleFilter);
      if (activeFilter !== "ALL") params.set("active", activeFilter === "active" ? "true" : "false");

      const [usersResponse, specialtiesResponse] = await Promise.all([
        fetchWithRetry(`/api/users?${params.toString()}`),
        fetchWithRetry("/api/specialties"),
      ]);

      if (!usersResponse.ok) throw new Error("No pudimos cargar los usuarios.");
      if (!specialtiesResponse.ok) throw new Error("No pudimos cargar las especialidades.");

      const usersJson = (await usersResponse.json()) as { data: UserRecord[]; total: number };
      const specialtiesJson = (await specialtiesResponse.json()) as Specialty[];

      setUsers(usersJson.data ?? []);
      setTotal(usersJson.total ?? 0);
      setSpecialties(specialtiesJson);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, roleFilterState, activeFilter, page]);

  const handleCreate = async () => {
    if (!canSubmit) return;

    setSaving(true);
    setError(null);

    const resolvedRole = roleLock ?? formState.role;
    const payload = {
      email: formState.email,
      password: formState.password,
      name: formState.name,
      lastName: formState.lastName,
      role: resolvedRole,
      phone: resolvedRole === "PACIENTE" ? formState.phone : undefined,
      documentId: resolvedRole === "PACIENTE" ? formState.documentId : undefined,
      specialtyId: resolvedRole === "PROFESIONAL" ? formState.specialtyId : undefined,
      slotDurationMinutes:
        resolvedRole === "PROFESIONAL" && formState.slotDurationMinutes
          ? Number(formState.slotDurationMinutes)
          : undefined,
    };

    const response = await fetchWithTimeout("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setPage(1);
      void loadData();
      setFormState({ ...defaultFormState, role: roleLock ?? defaultFormState.role });
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
    const resolvedRole = draft?.role ?? roleLock;
    if (!draft || !resolvedRole) return;

    if (resolvedRole === "PROFESIONAL" && !(draft.specialtyId ?? user.professional?.specialty?.id)) {
      setError("Selecciona una especialidad para el profesional.");
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: resolvedRole,
        specialtyId:
          resolvedRole === "PROFESIONAL" ? draft.specialtyId ?? user.professional?.specialty?.id : undefined,
      }),
    });

    if (response.ok) {
      const updated = (await response.json()) as UserRecord;
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, ...updated } : item)));
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

  const toggleActive = async (user: UserRecord) => {
    setSaving(true);
    setError(null);

    const response = await fetchWithTimeout(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });

    if (response.ok) {
      const updated = (await response.json()) as { active: boolean };
      setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, active: updated.active } : item)));
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos actualizar el usuario.");
    }

    setSaving(false);
  };

  const deleteUser = async (user: UserRecord) => {
    setSaving(true);
    setError(null);
    const response = await fetchWithTimeout(`/api/users/${user.id}`, { method: "DELETE" });

    if (response.ok) {
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      setTotal((prev) => prev - 1);
    } else {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "No pudimos eliminar el usuario.");
    }

    setSaving(false);
  };

  const displayedUsers = users;

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
          {roleLock ? (
            <div className="input flex h-11 items-center text-sm text-slate-600 dark:text-slate-300">
              {roleLabels[roleLock]}
            </div>
          ) : (
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
          )}
          {(roleLock ?? formState.role) === "PROFESIONAL" ? (
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
          {(roleLock ?? formState.role) === "PROFESIONAL" ? (
            <input
              className="input h-11 text-sm"
              placeholder="Duración slot (min)"
              value={formState.slotDurationMinutes}
              onChange={(event) => setFormState((prev) => ({ ...prev, slotDurationMinutes: event.target.value }))}
              disabled={saving}
            />
          ) : null}
          {(roleLock ?? formState.role) === "PACIENTE" ? (
            <input
              className="input h-11 text-sm"
              placeholder="Teléfono"
              value={formState.phone}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
              disabled={saving}
            />
          ) : null}
          {(roleLock ?? formState.role) === "PACIENTE" ? (
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
          onClick={() => void handleCreate()}
          disabled={!canSubmit}
        >
          Crear usuario
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-surface-muted/80 dark:bg-surface-elevated/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Usuarios</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {total > 0 ? `${total} usuario${total !== 1 ? "s" : ""}` : "Administra roles y accesos."}
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
            onClick={() => void loadData()}
            disabled={loading}
          >
            Recargar
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <input
            className="input h-10 text-sm"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {!roleFilter && (
            <div className="flex flex-wrap gap-2">
              {(["ALL", "PACIENTE", "PROFESIONAL", "RECEPCIONISTA", "ADMINISTRADOR"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRoleFilterState(r); setPage(1); }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    roleFilterState === r
                      ? "bg-brand-teal text-white"
                      : "border border-slate-200 text-slate-600 dark:border-surface-muted/70 dark:text-slate-300"
                  }`}
                >
                  {r === "ALL" ? "Todos" : roleLabels[r]}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            {(["ALL", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => { setActiveFilter(f); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                  activeFilter === f
                    ? "bg-brand-teal text-white"
                    : "border border-slate-200 text-slate-600 dark:border-surface-muted/70 dark:text-slate-300"
                }`}
              >
                {f === "ALL" ? "Todos" : f === "active" ? "Activos" : "Inactivos"}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando usuarios...</p>
        ) : (
          <div className="mt-4 space-y-3">
            {displayedUsers.map((user) => {
              const draft = drafts[user.id] ?? {};
              const selectedRole = roleLock ?? draft.role ?? user.role;
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
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                        }`}>
                          {user.active ? "Activo" : "Inactivo"}
                        </span>
                        {user._isGoogleUser && (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                            Google
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roleLock ? (
                        <div className="input flex h-9 items-center text-xs text-slate-600 dark:text-slate-300">
                          {roleLabels[roleLock]}
                        </div>
                      ) : (
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
                      )}
                      {selectedRole === "PROFESIONAL" ? (
                        <select
                          className="input h-9 text-xs"
                          value={draft.specialtyId ?? user.professional?.specialty?.id ?? ""}
                          onChange={(event) =>
                            updateDraft(user.id, { specialtyId: event.target.value, role: selectedRole })
                          }
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
                        onClick={() => void applyDraft(user)}
                        disabled={saving || (!draft.role && !roleLock)}
                      >
                        Guardar rol
                      </button>
                      <button
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${
                          user.active
                            ? "border-red-200 text-red-600"
                            : "border-green-200 text-green-600"
                        }`}
                        onClick={() => void toggleActive(user)}
                        disabled={saving}
                      >
                        {user.active ? "Desactivar" : "Activar"}
                      </button>
                      {user.hasLocalPassword ? (
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600 dark:border-surface-muted/70 dark:text-slate-200"
                          onClick={() => setResetModal({ userId: user.id, userEmail: user.email })}
                          disabled={saving}
                        >
                          Resetear password
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold uppercase text-red-600"
                        onClick={() => void deleteUser(user)}
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

        {total > 20 ? (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              Mostrando {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} de {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase disabled:opacity-40"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Anterior
              </button>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase disabled:opacity-40"
                disabled={page * 20 >= total || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {resetModal ? (
        <ResetPasswordModal
          userId={resetModal.userId}
          userEmail={resetModal.userEmail}
          onClose={() => setResetModal(null)}
        />
      ) : null}
    </div>
  );
}
