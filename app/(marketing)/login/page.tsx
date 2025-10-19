import type { Metadata } from "next";
import Link from "next/link";

const rolePortals = [
  {
    name: "Pacientes",
    description: "Consulta tu historia clínica, gestiona citas y recibe recordatorios personalizados.",
    href: "/portal/pacientes",
    icon: "favorite",
  },
  {
    name: "Profesionales",
    description: "Accede a tu agenda, firma evoluciones clínicas y colabora con el equipo interdisciplinario.",
    href: "/portal/profesionales",
    icon: "stethoscope",
  },
  {
    name: "Administración",
    description: "Gestiona sedes, indicadores, facturación y la experiencia integral de los pacientes.",
    href: "/portal/administracion",
    icon: "monitoring",
  },
] as const;

export const metadata: Metadata = {
  title: "Ingreso a portales DentPro",
  description:
    "Accede a los portales de pacientes, profesionales o administración de DentPro Colombia desde un único punto de entrada.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-light/40 via-white to-brand-light/30 py-20 dark:from-surface-base dark:via-surface-base dark:to-surface-base">
      <div className="mx-auto w-full max-w-6xl px-6">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-teal transition hover:text-brand-indigo dark:text-accent-cyan dark:hover:text-white"
        >
          <span className="material-symbols-rounded text-base" aria-hidden="true">
            arrow_back
          </span>
          Volver a DentPro Colombia
        </Link>

        <div className="grid gap-12 lg:grid-cols-[1.05fr,0.95fr]">
          <section className="card space-y-8 dark:bg-surface-elevated/80">
            <header className="space-y-4">
              <span className="badge">Portal unificado</span>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white md:text-4xl">
                Inicia sesión y continúa tu experiencia con DentPro
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300">
                Desde aquí centralizamos el acceso seguro a los portales exclusivos para pacientes, profesionales y administradores.
                Escoge tu rol y utiliza tus credenciales para continuar. ¿Es tu primera vez? Nuestro equipo puede ayudarte a activar tu cuenta.
              </p>
            </header>

            <div className="rounded-3xl border border-brand-light/70 bg-white/70 p-8 shadow-inner shadow-brand-teal/10 backdrop-blur dark:border-surface-muted/70 dark:bg-surface-base/80 dark:shadow-surface-dark">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Accesos directos por rol</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Selecciona el portal que necesitas para ir directamente al entorno correspondiente.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {rolePortals.map((role) => (
                  <Link
                    key={role.name}
                    href={role.href}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-brand-light/60 bg-white/80 p-5 transition hover:-translate-y-1 hover:border-brand-teal hover:shadow-xl hover:shadow-brand-teal/20 dark:border-surface-muted/70 dark:bg-surface-base/90 dark:hover:border-accent-cyan dark:hover:shadow-glow-dark"
                  >
                    <div className="space-y-3">
                      <span className="material-symbols-rounded inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light/80 text-brand-teal transition group-hover:bg-brand-teal group-hover:text-white dark:bg-accent-cyan/20 dark:text-accent-cyan dark:group-hover:bg-accent-cyan dark:group-hover:text-surface-base">
                        {role.icon}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{role.name}</h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{role.description}</p>
                      </div>
                    </div>
                    <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-teal transition group-hover:gap-2 group-hover:text-brand-indigo dark:text-accent-cyan dark:group-hover:text-white">
                      Ir al portal
                      <span className="material-symbols-rounded text-base" aria-hidden="true">
                        arrow_outward
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="card space-y-8 dark:bg-surface-elevated/80">
            <header className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Ingresa con tus credenciales</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Para proteger tu información utilizamos autenticación multifactor. Después de ingresar tus datos te enviaremos un código de verificación.
              </p>
            </header>
            <form className="space-y-6" action="#" method="post">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="tucorreo@dentpro.co"
                  className="input"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Ingresa tu contraseña"
                  className="input"
                  autoComplete="current-password"
                />
                <div className="flex justify-end">
                  <Link
                    href="/recuperar"
                    className="text-sm font-semibold text-brand-teal transition hover:text-brand-indigo dark:text-accent-cyan dark:hover:text-white"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Ingresa como
                </label>
                <select id="role" name="role" className="input" defaultValue="paciente">
                  <option value="paciente">Paciente</option>
                  <option value="profesional">Profesional</option>
                  <option value="administracion">Administración</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                Iniciar sesión
              </button>
            </form>
            <footer className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <p>
                ¿No tienes usuario aún? Escríbenos a
                <a href="mailto:soporte@dentprocol.com" className="font-semibold text-brand-teal transition hover:text-brand-indigo dark:text-accent-cyan dark:hover:text-white">
                  soporte@dentprocol.com
                </a>
                y te ayudaremos a crearlo.
              </p>
              <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-500">
                <span className="material-symbols-rounded text-base" aria-hidden="true">
                  shield_lock
                </span>
                Protegemos tus datos siguiendo normas de bioseguridad digital y cifrado de extremo a extremo.
              </p>
            </footer>
          </section>
        </div>
      </div>
    </main>
  );
}
