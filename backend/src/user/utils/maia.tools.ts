import { getMaiaTimeoutMs } from "src/config/configs/maia.config";
import { MaiaUnavailableException } from "../errors/maia-unavailable.exception";

type MaiaFinderResponse = {
  data?: Array<{
    values?: {
      structure?: {
        values?: {
          fullCode?: string | null;
        } | null;
      } | null;
      fullName?: string | null;
      lastName?: string | null;
      firstName?: string | null;
    } | null;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMaiaResponse(payload: unknown): payload is MaiaFinderResponse {
  if (!isRecord(payload)) return false;
  if (!Array.isArray(payload.data)) return false;
  return payload.data.every((entry: unknown) => {
    if (!isRecord(entry)) return false;
    if (entry.values == null) return true;
    if (!isRecord(entry.values)) return false;
    const values = entry.values;
    if (
      ["fullName", "lastName", "firstName"].some(
        (key) => values[key] != null && typeof values[key] !== "string",
      )
    ) {
      return false;
    }
    if (values.structure == null) return true;
    if (!isRecord(values.structure)) return false;
    if (values.structure.values == null) return true;
    if (!isRecord(values.structure.values)) return false;
    const fullCode = values.structure.values.fullCode;
    return fullCode == null || typeof fullCode === "string";
  });
}

function isMockEnabled(): boolean {
  const value = process.env.MOCK_MAIA_SERVICE;
  return value === "true" || value === "1";
}

function normalizeOrganizationPath(path: string): string | null {
  const trimmed = path.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function extractOrganizationPath(payload: MaiaFinderResponse): string | null {
  const fullCode = payload.data?.[0]?.values?.structure?.values?.fullCode;
  if (!fullCode || typeof fullCode !== "string") {
    return null;
  }

  return normalizeOrganizationPath(fullCode);
}

function extractFirstAndLastname(payload: MaiaFinderResponse) {
  const lastName = payload.data?.[0]?.values?.lastName;
  const firstName = payload.data?.[0]?.values?.firstName;
  const fullName = payload.data?.[0]?.values?.fullName;

  return {
    lastName: lastName ?? "",
    firstName: firstName ?? "",
    fullName: fullName ?? "",
  };
}

export async function getOrganizationPathFromMaia(
  email: string,
): Promise<string | null> {
  if (isMockEnabled()) {
    return process.env.MOCK_MAIA_ORGANIZATION?.trim() || "ORGANISATION";
  }

  const payload = await callMaia(email);
  return extractOrganizationPath(payload);
}

async function callMaia(email: string): Promise<MaiaFinderResponse> {
  const maiaUrl = process.env.MAIA_API_URL?.trim();
  if (!maiaUrl) throw new MaiaUnavailableException("configuration");
  const signal = AbortSignal.timeout(getMaiaTimeoutMs());

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  };

  // `fetch` global à dessein : MAIA est interne au SI et ne doit pas passer par le
  // proxy sortant (cf. src/common/http/outbound-dispatcher.ts).
  let response: Response;
  try {
    response = await fetch(maiaUrl, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        objectType: "Person",
        criteria: [
          {
            displayFilter: {
              label: { fr: "Courriel" },
              value: email,
            },
            field: "mail",
            operator: "contains",
            value: email,
          },
        ],
        fields: [
          "fullName",
          "phoneNumber.number",
          "structure.fullCode",
          "mail",
          "lastName",
          "firstName",
        ],
        metadata: ["pagination"],
        ordering: [{ mode: "asc", field: "fullName" }],
        pagination: {
          range: {
            start: 0,
            limit: 20,
          },
        },
      }),
    });
  } catch (error) {
    throw new MaiaUnavailableException(
      signal.aborted ? "timeout" : "network",
      error,
    );
  }

  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    throw new MaiaUnavailableException("http", undefined, response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new MaiaUnavailableException(
      signal.aborted ? "timeout" : "response",
      error,
    );
  }
  if (!isMaiaResponse(payload)) {
    throw new MaiaUnavailableException("response");
  }
  return payload;
}

export async function getFullNameFromMaia(email: string) {
  if (isMockEnabled()) {
    return {
      lastName: "DOE",
      firstName: "John",
      fullName: "John DOE",
    };
  }

  const payload = await callMaia(email);
  return extractFirstAndLastname(payload);
}
