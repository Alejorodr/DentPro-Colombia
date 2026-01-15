"use client";

import { createContext, useContext } from "react";

interface ProfessionalPreferencesContextValue {
  privacyMode: boolean;
  setPrivacyMode: (value: boolean) => void;
}

const ProfessionalPreferencesContext = createContext<ProfessionalPreferencesContextValue | null>(null);

export function ProfessionalPreferencesProvider({
  privacyMode,
  setPrivacyMode,
  children,
}: {
  privacyMode: boolean;
  setPrivacyMode: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <ProfessionalPreferencesContext.Provider value={{ privacyMode, setPrivacyMode }}>
      {children}
    </ProfessionalPreferencesContext.Provider>
  );
}

export function useProfessionalPreferences() {
  const context = useContext(ProfessionalPreferencesContext);
  if (!context) {
    throw new Error("useProfessionalPreferences must be used within ProfessionalPreferencesProvider");
  }
  return context;
}
