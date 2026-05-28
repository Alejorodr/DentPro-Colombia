"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  EnvelopeSimple,
  Lock,
  Phone,
  ShieldCheck,
  UserCircle,
  WarningCircle,
} from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

interface RegisterFormProps {
  googleEnabled?: boolean;
}

type FieldErrors = Partial<Record<"name" | "lastName" | "email" | "password" | "confirmPassword" | "phone", string>>;

export function RegisterForm({ googleEnabled = false }: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "El nombre es obligatorio.";
    if (!lastName.trim()) errors.lastName = "El apellido es obligatorio.";
    if (!email.trim()) errors.email = "El correo es obligatorio.";
    if (!password) errors.password = "La contraseña es obligatoria.";
    if (password && password !== confirmPassword) errors.confirmPassword = "Las contraseñas no coinciden.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGoogleSignUp = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await signIn("google", { redirectTo: "/portal/paciente" });
      setFormError("No pudimos iniciar con Google. Inténtalo de nuevo.");
    } catch {
      setFormError("No pudimos iniciar con Google. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), lastName: lastName.trim(), email: email.trim(), password, phone: phone.trim() || undefined }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        if (res.status === 409) {
          setFieldErrors({ email: "Ya existe una cuenta con ese correo." });
        } else {
          setFormError(data?.error ?? "No se pudo crear la cuenta. Inténtalo de nuevo.");
        }
        setIsSubmitting(false);
        return;
      }

      const result = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (result?.error) {
        router.push("/auth/login?registered=1");
        return;
      }

      router.replace("/portal/paciente");
      router.refresh();
    } catch {
      setFormError("No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 rounded-[1.75rem] border border-white/70 bg-white/90 p-8 shadow-xl shadow-slate-900/10 transition-colors duration-300 dark:border-surface-muted/60 dark:bg-surface-base/85 dark:shadow-surface-dark">
      <div className="space-y-2 text-left">
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-light/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-teal dark:bg-surface-muted/70 dark:text-accent-cyan">
          <Lock className="h-4 w-4" weight="bold" aria-hidden="true" />
          Registro seguro
        </p>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Crea tu cuenta DentPro</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Registrate para agendar citas y gestionar tu historial clínico en línea.
          </p>
        </div>
      </div>

      {formError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-100" role="alert" aria-live="assertive">
          <WarningCircle className="mt-0.5 h-5 w-5 shrink-0" weight="bold" aria-hidden="true" />
          <div>
            <p className="font-semibold">No se pudo crear la cuenta</p>
            <p className="text-red-700 dark:text-red-100/90">{formError}</p>
          </div>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {googleEnabled ? (
          <>
            <Button type="button" className="h-12 w-full" disabled={isSubmitting} onClick={handleGoogleSignUp}>
              Continuar con Google
            </Button>
            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-200 dark:bg-surface-muted/60" />
              <span className="text-xs uppercase tracking-wide text-slate-500">o completa el formulario</span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-surface-muted/60" />
            </div>
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <FieldInput
            id="reg-name"
            label="Nombre"
            value={name}
            onChange={setName}
            disabled={isSubmitting}
            error={fieldErrors.name}
            icon={<UserCircle className="h-4 w-4" aria-hidden="true" />}
            placeholder="Tu nombre"
            autoComplete="given-name"
          />
          <FieldInput
            id="reg-lastName"
            label="Apellido"
            value={lastName}
            onChange={setLastName}
            disabled={isSubmitting}
            error={fieldErrors.lastName}
            icon={<UserCircle className="h-4 w-4" aria-hidden="true" />}
            placeholder="Tu apellido"
            autoComplete="family-name"
          />
        </div>

        <FieldInput
          id="reg-email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={setEmail}
          disabled={isSubmitting}
          error={fieldErrors.email}
          icon={<EnvelopeSimple className="h-4 w-4" aria-hidden="true" />}
          placeholder="tu@correo.com"
          autoComplete="email"
        />

        <FieldInput
          id="reg-phone"
          label="Teléfono (opcional)"
          type="tel"
          value={phone}
          onChange={setPhone}
          disabled={isSubmitting}
          icon={<Phone className="h-4 w-4" aria-hidden="true" />}
          placeholder="+57 300 000 0000"
          autoComplete="tel"
        />

        <FieldInput
          id="reg-password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={setPassword}
          disabled={isSubmitting}
          error={fieldErrors.password}
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          hint="Debe incluir mayúscula, minúscula, número y símbolo."
        />

        <FieldInput
          id="reg-confirm"
          label="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={isSubmitting}
          error={fieldErrors.confirmPassword}
          icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
        />

        <Button
          type="submit"
          className="h-12 w-full"
          disabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {!isSubmitting && <ArrowRight className="h-4 w-4" weight="bold" aria-hidden="true" />}
          {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        </Button>

        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="font-semibold text-brand-teal transition-colors hover:text-brand-indigo dark:text-accent-cyan">
            Inicia sesión
          </Link>
        </p>
      </form>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        Al registrarte aceptas nuestra{" "}
        <Link href="/politica-de-tratamiento-de-datos" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200">
          política de datos
        </Link>{" "}
        y{" "}
        <Link href="/terminos-y-condiciones" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-200">
          términos y condiciones
        </Link>
        .
      </p>
    </div>
  );
}

interface FieldInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: string;
  icon: React.ReactNode;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}

function FieldInput({ id, label, value, onChange, disabled, error, icon, placeholder, type = "text", autoComplete, hint }: FieldInputProps) {
  return (
    <label className="block space-y-1.5 text-left" htmlFor={id}>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
        {label}
      </span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={`input h-11 pl-10 text-sm ${error ? "border-red-400 focus:border-red-500 focus:ring-red-300 dark:border-red-500/60" : ""}`}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={error ? "true" : undefined}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </label>
  );
}
