export type FoundationCheckContract = {
  id: string;
  label: string;
  status: "recorded";
  createdAt: string;
  updatedAt: string;
};

export const FOUNDATION_CHECK_ENDPOINT = "/foundation-checks";
