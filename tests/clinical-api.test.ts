import { describe, expect, it, beforeEach, vi } from "vitest";

import { GET as getPatientEpisodes, POST as createEpisode } from "@/app/api/clinical/patients/[patientId]/episodes/route";
import { POST as createNote } from "@/app/api/clinical/episodes/[episodeId]/notes/route";

const mockRequireSession = vi.fn();
const mockGetProfessionalProfile = vi.fn();
const mockProfessionalHasPatientAccess = vi.fn();
const mockLogClinicalAccess = vi.fn();

const mockPrisma = {
  patientProfile: {
    findUnique: vi.fn(),
  },
  clinicalEpisode: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
  clinicalNote: {
    create: vi.fn(),
  },
  appointment: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/authz", () => ({
  requireSession: () => mockRequireSession(),
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaClient: () => mockPrisma,
}));

vi.mock("@/lib/clinical/access", () => ({
  getProfessionalProfile: () => mockGetProfessionalProfile(),
  professionalHasPatientAccess: () => mockProfessionalHasPatientAccess(),
}));

vi.mock("@/lib/clinical/access-log", () => ({
  logClinicalAccess: () => mockLogClinicalAccess(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("clinical API guards", () => {
  it("allows a professional to create an episode and note", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "user-1", role: "PROFESIONAL" } });
    mockGetProfessionalProfile.mockResolvedValue({ id: "prof-1" });
    mockProfessionalHasPatientAccess.mockResolvedValue(true);
    mockPrisma.clinicalEpisode.create.mockResolvedValue({ id: "episode-1" });

    const episodeRequest = new Request("http://localhost/api/clinical/patients/patient-1/episodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Control", diagnosis: "OK" }),
    });

    const episodeResponse = await createEpisode(episodeRequest, {
      params: Promise.resolve({ patientId: "patient-1" }),
    });

    expect(episodeResponse.status).toBe(201);

    mockPrisma.clinicalEpisode.findFirst.mockResolvedValue({
      id: "episode-1",
      patientId: "patient-1",
      professionalId: "prof-1",
    });
    mockPrisma.clinicalNote.create.mockResolvedValue({ id: "note-1" });

    const noteRequest = new Request("http://localhost/api/clinical/episodes/episode-1/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Nota clínica" }),
    });

    const noteResponse = await createNote(noteRequest, {
      params: Promise.resolve({ episodeId: "episode-1" }),
    });

    expect(noteResponse.status).toBe(201);
  });

  it("blocks receptionist access to clinical endpoints", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "user-2", role: "RECEPCIONISTA" } });

    const request = new Request("http://localhost/api/clinical/patients/patient-1/episodes");
    const response = await getPatientEpisodes(request, {
      params: Promise.resolve({ patientId: "patient-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("filters episodes by patient visibility", async () => {
    mockRequireSession.mockResolvedValue({ user: { id: "user-3", role: "PACIENTE" } });
    mockPrisma.patientProfile.findUnique.mockResolvedValue({ id: "patient-1" });
    mockPrisma.clinicalEpisode.findMany.mockResolvedValue([]);
    mockPrisma.clinicalEpisode.count.mockResolvedValue(0);

    const request = new Request("http://localhost/api/clinical/patients/patient-1/episodes");
    await getPatientEpisodes(request, { params: Promise.resolve({ patientId: "patient-1" }) });

    expect(mockPrisma.clinicalEpisode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visibleToPatient: true }),
      }),
    );
  });
});
