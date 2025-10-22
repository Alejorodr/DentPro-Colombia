import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isUserRole } from "@/lib/auth/roles";

export default async function RoleDashboardPage({
  params,
}: { params: Promise<{ role: string }> }) {
  const { role: requestedRole } = await params;

  if (!isUserRole(requestedRole)) {
    notFound();
  }

  const session = await auth();
  if (!session) {
    redirect(`/login?callbackUrl=/${requestedRole}`);
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard: {requestedRole}</h1>
    </main>
  );
}
