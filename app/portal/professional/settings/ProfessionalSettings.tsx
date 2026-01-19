"use client";

import { useEffect, useState } from "react";

import { ShieldCheck } from "@/components/ui/Icon";

import { useProfessionalPreferences } from "@/app/portal/professional/components/ProfessionalContext";
import { fetchWithRetry } from "@/lib/http";

interface ProfileInfo {
  name: string;
  lastName: string;
  email: string;
  specialty?: string | null;
}

export function ProfessionalSettings() {
  const { privacyMode, setPrivacyMode } = useProfessionalPreferences();
  const [profile, setProfile] = useState<ProfileInfo | null>(null);

  useEffect(() => {
    const load = async () => {
      const response = await fetchWithRetry("/api/professional/profile");
      if (!response.ok) return;
      const data = (await response.json()) as { profile: ProfileInfo };
      setProfile(data.profile);
    };
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Settings</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Profile & preferences</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <h2 className="text-lg font-semibold">Professional profile</h2>
          {profile ? (
            <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p>
                <span className="font-semibold text-slate-900 dark:text-white">Name:</span> {profile.name} {profile.lastName}
              </p>
              <p>
                <span className="font-semibold text-slate-900 dark:text-white">Email:</span> {profile.email}
              </p>
              <p>
                <span className="font-semibold text-slate-900 dark:text-white">Specialty:</span> {profile.specialty ?? "-"}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Loading profile...</p>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-slate-400" />
            <h2 className="text-lg font-semibold">Privacy Mode</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Mask sensitive patient data when sharing your screen.
          </p>
          <button
            type="button"
            onClick={() => setPrivacyMode(!privacyMode)}
            className="mt-4 rounded-2xl border border-brand-indigo px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-indigo"
          >
            {privacyMode ? "Disable" : "Enable"} privacy mode
          </button>
        </div>
      </div>
    </div>
  );
}
