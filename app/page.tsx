export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-hero-light bg-cover bg-fixed px-6 py-16 text-center text-slate-900 transition-colors dark:bg-hero-dark dark:text-slate-100">
      <span className="badge">Bienvenido</span>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
        DentPro Colombia
      </h1>
      <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">
        Estamos construyendo una nueva experiencia digital para el cuidado de tu sonrisa. Esta es una versión inicial de nuestra plataforma con Next.js y Tailwind CSS.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a className="btn-primary" href="#contacto">
          Agenda tu cita
        </a>
        <a className="btn-secondary" href="#especialistas">
          Conoce al equipo
        </a>
      </div>
    </main>
  );
}
