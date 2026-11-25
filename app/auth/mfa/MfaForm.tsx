"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { signOut } from "next-auth/react";

import { CheckCircle, Lock, ShieldCheck, WarningCircle } from "@/components/ui/Icon";

type MfaFormProps = {
  mode: "enroll" | "verify";
  /** Ruta del portal a la que se entra al completar el segundo paso. */
  destination: string;
  email: string;
};

type Enrollment = { secret: string; qrDataUrl: string };

async function postJson<T>(url: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!response.ok) return { ok: false, error: data?.error ?? "Algo salió mal. Intenta de nuevo." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "No hay conexión. Revisa tu internet e intenta de nuevo." };
  }
}

/** Agrupa el secreto en bloques de 4 para copiarlo a mano sin perderse. */
function groupSecret(secret: string) {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

/**
 * Pantalla del segundo factor (DOG-28). En modo `enroll` muestra el QR, confirma un código y
 * entrega los códigos de respaldo; en modo `verify` pide el código de la app o uno de respaldo.
 */
export function MfaForm({ mode, destination, email }: MfaFormProps) {
  const codeId = useId();
  const hintId = useId();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedCodes, setSavedCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (mode !== "enroll") return;
    let cancelled = false;
    void postJson<Enrollment>("/api/auth/mfa/setup").then((result) => {
      if (cancelled) return;
      if (result.ok) setEnrollment(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  // La navegación completa hace que el servidor lea la cookie de sesión ya verificada.
  const goToPortal = () => window.location.assign(destination);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    if (mode === "enroll") {
      const result = await postJson<{ backupCodes: string[] }>("/api/auth/mfa/enable", { code });
      if (result.ok) setBackupCodes(result.data.backupCodes);
      else setError(result.error);
    } else {
      const result = await postJson<{ method: string }>("/api/auth/mfa/verify", { code });
      if (result.ok) {
        goToPortal();
        return;
      }
      setError(result.error);
    }
    setCode("");
    setSubmitting(false);
  };

  const copyCodes = () => {
    if (!backupCodes) return;
    void navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const heading = backupCodes
    ? "Guarda tus códigos de respaldo"
    : mode === "enroll"
      ? "Activa la verificación en dos pasos"
      : "Verificación en dos pasos";

  return (
    <div className="space-y-6 rounded-[1.75rem] border border-white/70 bg-white/95 p-8 shadow-xl shadow-slate-900/10 dark:border-surface-muted/60 dark:bg-surface-base/90 dark:shadow-surface-dark">
      <div className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-light/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-surface-muted/70 dark:text-accent-cyan">
          <Lock className="h-3.5 w-3.5" weight="bold" aria-hidden="true" />
          Acceso seguro
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{heading}</h1>
        {email ? <p className="text-sm text-slate-500 dark:text-slate-400">{email}</p> : null}
      </div>

      {backupCodes ? (
        <div className="space-y-5" data-testid="mfa-backup-codes">
          <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Si pierdes el celular, cada código te deja entrar una vez. Guárdalos en un lugar seguro: no los volverás a ver.
            </span>
          </p>
          <ol className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm tabular-nums text-slate-900 dark:border-surface-muted dark:bg-surface-muted/40 dark:text-white">
            {backupCodes.map((item) => (
              <li key={item} className="select-all">
                {item}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={copyCodes}
            className="w-full rounded-full border border-slate-200 py-2 text-sm font-semibold text-slate-600 dark:border-surface-muted dark:text-slate-200"
          >
            {copied ? "Copiados" : "Copiar códigos"}
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={savedCodes} onChange={(event) => setSavedCodes(event.target.checked)} />
            Ya guardé mis códigos de respaldo
          </label>
          <button type="button" className="btn-primary w-full" disabled={!savedCodes} onClick={goToPortal}>
            Entrar al portal
          </button>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} aria-busy={submitting}>
          {mode === "enroll" ? (
            <ol className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">1.</span> Instala una app autenticadora en tu
                  celular, como Google Authenticator o Microsoft Authenticator.
                </p>
              </li>
              <li className="space-y-3">
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">2.</span> Escanea este código con la app.
                </p>
                {enrollment ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- QR generado como data URL, no pasa por next/image */}
                    <img
                      src={enrollment.qrDataUrl}
                      alt="Código QR para configurar la app autenticadora"
                      width={220}
                      height={220}
                      className="mx-auto rounded-xl border border-slate-200 bg-white p-2"
                    />
                    <details className="text-xs">
                      <summary className="cursor-pointer font-semibold text-brand-teal dark:text-accent-cyan">
                        ¿No puedes escanearlo? Escribe la clave
                      </summary>
                      <code className="mt-2 block select-all break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm text-slate-900 dark:bg-surface-muted dark:text-white" data-testid="mfa-secret">
                        {groupSecret(enrollment.secret)}
                      </code>
                    </details>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Generando el código…</p>
                )}
              </li>
              <li>
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">3.</span> Escribe el código de 6 dígitos que
                  muestra la app.
                </p>
              </li>
            </ol>
          ) : (
            <p className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal dark:text-accent-cyan" aria-hidden="true" />
              Tu cuenta tiene acceso a datos clínicos. Confirma que eres tú con tu app autenticadora.
            </p>
          )}

          {error ? (
            <p role="alert" data-testid="mfa-error" className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor={codeId} className="block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {useBackupCode ? "Código de respaldo" : "Código de verificación"}
            </label>
            <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
              {useBackupCode ? "Uno de los 10 códigos que guardaste, como ABCDE-FGH23." : "Los 6 dígitos que muestra la app ahora mismo."}
            </p>
            {useBackupCode ? (
              <input
                key="backup"
                id={codeId}
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={11}
                required
                aria-describedby={hintId}
                className="input h-12 text-base font-mono uppercase tracking-[0.2em]"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            ) : (
              <input
                key="totp"
                id={codeId}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                aria-describedby={hintId}
                className="input h-12 text-lg font-mono tabular-nums tracking-[0.35em]"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              />
            )}
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting || (mode === "enroll" && !enrollment)}>
            {submitting ? "Verificando…" : mode === "enroll" ? "Activar" : "Verificar"}
          </button>

          {mode === "verify" ? (
            <button
              type="button"
              className="w-full text-sm font-semibold text-brand-teal hover:text-brand-indigo dark:text-accent-cyan"
              onClick={() => {
                setUseBackupCode((value) => !value);
                setCode("");
                setError(null);
              }}
            >
              {useBackupCode ? "Usar la app autenticadora" : "No tengo el celular: usar un código de respaldo"}
            </button>
          ) : null}
        </form>
      )}

      {!backupCodes ? (
        <p className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500 dark:border-surface-muted dark:text-slate-400">
          ¿Perdiste el acceso a la app y a los códigos? Pide a un administrador que restablezca tu verificación.{" "}
          <button
            type="button"
            className="font-semibold text-brand-teal underline-offset-2 hover:underline dark:text-accent-cyan"
            onClick={() => void signOut({ callbackUrl: "/auth/login" })}
          >
            Salir
          </button>
        </p>
      ) : (
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <CheckCircle className="h-3.5 w-3.5 text-brand-teal dark:text-accent-cyan" aria-hidden="true" />
          Verificación en dos pasos activa
        </p>
      )}
    </div>
  );
}
