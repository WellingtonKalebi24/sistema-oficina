export type FoundationCheck = {
  id: string;
  label: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type FoundationCheckResponse = {
  data: FoundationCheck;
};

type FoundationChecksResponse = {
  data: FoundationCheck[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function listFoundationChecks(): Promise<FoundationCheck[]> {
  const response = await fetch(`${API_BASE_URL}/foundation-checks`);

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar os registros de fundacao.");
  }

  const payload = (await response.json()) as FoundationChecksResponse;
  return payload.data;
}

export async function createFoundationCheck(label: string): Promise<FoundationCheck> {
  const response = await fetch(`${API_BASE_URL}/foundation-checks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ label }),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel registrar a verificacao.");
  }

  const payload = (await response.json()) as FoundationCheckResponse;
  return payload.data;
}
