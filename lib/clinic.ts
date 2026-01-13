export type ClinicInfo = {
  name: string;
  city: string;
  address: string;
};

const DEFAULT_CLINIC: ClinicInfo = {
  name: "DentPro Portal",
  city: "Chía, Colombia",
  address: "Cra. 7 #13-180, Chía, Cundinamarca",
};

export function getClinicInfo(): ClinicInfo {
  return {
    name: process.env.CLINIC_NAME?.trim() || DEFAULT_CLINIC.name,
    city: process.env.CLINIC_CITY?.trim() || DEFAULT_CLINIC.city,
    address: process.env.CLINIC_ADDRESS?.trim() || DEFAULT_CLINIC.address,
  };
}
