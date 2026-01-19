"use client";

import { useEffect, useMemo, useState } from "react";

import { Card } from "@/app/portal/components/ui/Card";
import { Table } from "@/app/portal/components/ui/Table";
import { fetchWithRetry } from "@/lib/http";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);

type ServiceItem = {
  id: string;
  name: string;
  description?: string | null;
  priceCents: number;
  active: boolean;
};

export function ReceptionistBilling() {
  const [services, setServices] = useState<ServiceItem[]>([]);

  useEffect(() => {
    const loadServices = async () => {
      const response = await fetchWithRetry("/api/services?active=true&pageSize=50");
      if (response.ok) {
        const data = (await response.json()) as { data: ServiceItem[] };
        setServices(data.data ?? []);
      }
    };

    void loadServices();
  }, []);

  const summary = useMemo(() => {
    const total = services.reduce((acc, service) => acc + service.priceCents, 0);
    const avg = services.length > 0 ? total / services.length : 0;
    return { total, avg };
  }, [services]);

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal dark:text-accent-cyan">Billing</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Servicios y precios</h1>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total servicios</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{services.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Precio promedio</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {formatCurrency(summary.avg / 100)}
          </p>
        </Card>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Listado</p>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Servicios activos</h2>
        </div>
        <Table>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-surface-muted/70 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Servicio</th>
              <th className="px-4 py-3 font-semibold">Descripción</th>
              <th className="px-4 py-3 font-semibold">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-600 dark:divide-surface-muted dark:text-slate-200">
            {services.map((service) => (
              <tr key={service.id} className="bg-white dark:bg-surface-elevated/60">
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{service.name}</td>
                <td className="px-4 py-3">{service.description ?? "-"}</td>
                <td className="px-4 py-3">{formatCurrency(service.priceCents / 100)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
