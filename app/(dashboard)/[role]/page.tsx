import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";

const VALID_ROLES = ["admin","user","staff","patient"];

export default async function RoleDashboardPage({
  params,
}: { params: Promise<{ role: string }> }) {
  const { role: requestedRole } = await params;

  if (!VALID_ROLES.includes(requestedRole)) {
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
