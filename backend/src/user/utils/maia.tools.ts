type MaiaFinderResponse = {
  data?: Array<{
    values?: {
      structure?: {
        values?: {
          fullCode?: string;
        };
      };
      fullName?: string;
      lastName?: string;
      firstName?: string;
    };
  }>;
};

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
  const maiaUrl = process.env.MAIA_API_URL!.trim();

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
  };

  const response = await fetch(maiaUrl, {
    method: "POST",
    headers,
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

  const payload = (await response.json()) as MaiaFinderResponse;
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
