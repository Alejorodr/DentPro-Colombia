import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function LoginPage(props: any) {
  const searchParams = (await props?.searchParams) ?? {};
  const callbackUrl = searchParams?.callbackUrl ?? "/";

  const session = await auth();

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-surface-elevated dark:ring-surface-muted">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Iniciar sesión
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Aquí irá el formulario real de inicio de sesión. Por ahora esta es una pantalla mínima para permitir que el build de producción funcione.
        </p>
      </div>
    </main>
  );
}
