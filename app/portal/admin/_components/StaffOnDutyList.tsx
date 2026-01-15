"use client";

import Link from "next/link";

import { AvatarFallback } from "@/app/portal/components/ui/AvatarFallback";

type StaffMember = {
  id: string;
  name: string;
  subtitle: string;
  status: "available" | "busy" | "off";
};

const statusStyles: Record<StaffMember["status"], string> = {
  available: "bg-emerald-500",
  busy: "bg-amber-500",
  off: "bg-slate-300",
};

const statusLabels: Record<StaffMember["status"], string> = {
  available: "Disponible",
  busy: "Ocupado",
  off: "Fuera",
};

export function StaffOnDutyList({ staff }: { staff: StaffMember[] }) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-100/60 dark:border-surface-muted/70 dark:bg-surface-elevated/80">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Staff On Duty
          </p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Equipo activo</h2>
        </div>
        <Link href="/portal/admin/staff" className="text-xs font-semibold text-brand-teal dark:text-accent-cyan">
          Ver todos
        </Link>
      </div>
      <div className="space-y-3">
        {staff.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500 dark:border-surface-muted/70 dark:text-slate-400">
            No hay staff activo aún.
          </div>
        ) : (
          staff.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-surface-muted/60"
            >
              <div className="flex items-center gap-3">
                <AvatarFallback name={member.name} className="h-9 w-9" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{member.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className={`h-2 w-2 rounded-full ${statusStyles[member.status]}`} />
                {statusLabels[member.status]}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
