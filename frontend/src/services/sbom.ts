import { client } from "@/client/client.gen";
import { formDataBodySerializer } from "@/client/client";
import { isApiSuccess } from "@/api/api-result";
import { backendErrorMessage } from "@/utils/api-error";

export interface SbomPreview {
  id: string;
  sourceName: string;
  baseRevision: number;
  expiresAt: string;
  format: string;
  specVersion: string;
  projectVersion?: string | null;
  warnings: string[];
  counts: { added: number; removed: number; unchanged: number; changed: number };
  totalComponents: number;
  unchanged: boolean;
  changes: {
    added: Array<{ ref: string; product: string; version: string | null }>;
    removed: Array<{ ref: string; product: string; version: string | null }>;
    changed: Array<{
      before: { ref: string; product: string; version: string | null };
      after: { ref: string; product: string; version: string | null };
    }>;
    unchanged: number;
  };
}

export interface SbomComponent {
  id: string;
  ref: string;
  technology: string;
  product: string;
  version: string | null;
  purl: string | null;
  ecosystem: string | null;
  type: string | null;
  identificationStatus: "identified" | "incomplete";
  sourceName: string;
  importId: string;
  context?: "inventory";
}

export interface SbomSourceImport {
  id: string;
  createdAt: string;
  format: string;
  specVersion: string;
  componentCount: number;
  status: string;
}

export interface SbomSource {
  id: string;
  name: string;
  context: string | null;
  active: boolean;
  revision: number;
  currentImportId: string | null;
  componentCount: number;
  updatedAt: string;
  importCount: number;
  imports: SbomSourceImport[];
}

export interface SbomImportDetail extends SbomPreview {
  status: string;
  createdAt: string;
  components: Array<
    Omit<SbomComponent, "id" | "importId" | "sourceName" | "context"> & {
      id?: string;
      context: "inventory" | "provenance" | "excluded";
    }
  >;
  relations: Array<{ from: string; to: string; type: string; resolved: boolean }>;
}

export class SbomRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "SbomRequestError";
  }
}

function readResult<T>(result: { data?: T; error?: unknown; response?: Response }): T {
  if (!isApiSuccess(result) || result.data === undefined) {
    const status = result.response?.status;
    const messages: Record<number, string> = {
      403: "Vous ne disposez plus des droits nécessaires pour cette opération.",
      409: "Cette source a changé. Relancez la prévisualisation avant de confirmer.",
      410: "Cette analyse a expiré. Analysez à nouveau le fichier avant de confirmer.",
      413: "Le fichier dépasse une limite autorisée. Réduisez sa taille ou le nombre de composants et de relations.",
      415: "Ce format n’est pas pris en charge. Utilisez un SBOM CycloneDX JSON 1.5, 1.6 ou 1.7, ou SPDX JSON 2.3.",
    };
    throw new SbomRequestError(
      (status && messages[status]) || backendErrorMessage(result.error) || "L’opération SBOM a échoué. Réessayez.",
      status,
    );
  }
  return result.data;
}

const applicationPath = (applicationId: string) => `/api/v2/applications/${encodeURIComponent(applicationId)}`;

export const sbomApi = {
  async preview(
    applicationId: string,
    body: { file: File; sourceName: string; context?: string; projectVersion?: string },
    signal?: AbortSignal,
  ) {
    return readResult(
      await client.post<{ 200: SbomPreview }>({
        url: `${applicationPath(applicationId)}/sbom-imports/preview`,
        ...formDataBodySerializer,
        headers: { "Content-Type": null },
        body,
        signal,
      }),
    );
  },
  async commit(applicationId: string, id: string, signal?: AbortSignal) {
    return readResult(
      await client.post<{ 200: { id: string; sourceId: string; revision: number; unchanged: boolean } }>({
        url: `${applicationPath(applicationId)}/sbom-imports/${encodeURIComponent(id)}/commit`,
        body: {},
        signal,
      }),
    );
  },
  async sources(applicationId: string, signal?: AbortSignal) {
    return readResult(await client.get<{ 200: SbomSource[] }>({ url: `${applicationPath(applicationId)}/sbom-sources`, signal }));
  },
  async sourceImports(applicationId: string, sourceId: string, query: { page: number; pageSize: number }, signal?: AbortSignal) {
    return readResult(
      await client.get<{ 200: { total: number; results: SbomSourceImport[] } }>({
        url: `${applicationPath(applicationId)}/sbom-sources/${encodeURIComponent(sourceId)}/imports`,
        query,
        signal,
      }),
    );
  },
  async detail(applicationId: string, id: string, signal?: AbortSignal) {
    return readResult(
      await client.get<{ 200: SbomImportDetail }>({
        url: `${applicationPath(applicationId)}/sbom-imports/${encodeURIComponent(id)}`,
        signal,
      }),
    );
  },
  async components(applicationId: string, query: { page: number; pageSize: number; search: string }, signal?: AbortSignal) {
    return readResult(
      await client.get<{ 200: { results: SbomComponent[]; total: number } }>({
        url: `${applicationPath(applicationId)}/software-components`,
        query,
        signal,
      }),
    );
  },
  async previewDeactivation(applicationId: string, source: Pick<SbomSource, "id" | "revision">, signal?: AbortSignal) {
    return readResult(
      await client.patch<{ 200: { removed: number; revision: number } }>({
        url: `${applicationPath(applicationId)}/sbom-sources/${encodeURIComponent(source.id)}`,
        body: { active: false, revision: source.revision, preview: true },
        signal,
      }),
    );
  },
  async deactivate(applicationId: string, source: Pick<SbomSource, "id" | "revision">, signal?: AbortSignal) {
    return readResult(
      await client.patch<{ 200: { id: string; revision: number } }>({
        url: `${applicationPath(applicationId)}/sbom-sources/${encodeURIComponent(source.id)}`,
        body: { active: false, revision: source.revision },
        signal,
      }),
    );
  },
};

export function sbomErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "L’opération SBOM a échoué. Réessayez.";
}

export function sbomDate(value: string): string {
  return new Date(value).toLocaleString("fr-FR");
}
