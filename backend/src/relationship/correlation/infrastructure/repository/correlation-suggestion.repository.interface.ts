import { CorrelationSuggestionStatus, Prisma } from "@prisma/client";

export type CorrelationSuggestionWithApplications =
  Prisma.CorrelationSuggestionGetPayload<{
    include: {
      sourceApplication: { select: { id: true; label: true } };
      targetApplication: { select: { id: true; label: true } };
    };
  }>;

export interface FindAllCorrelationSuggestionsOptions {
  status?: CorrelationSuggestionStatus;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}

export interface ICorrelationSuggestionRepository {
  findAllPaginated(options: FindAllCorrelationSuggestionsOptions): Promise<{
    results: CorrelationSuggestionWithApplications[];
    total: number;
  }>;
  findOne(id: string): Promise<CorrelationSuggestionWithApplications | null>;
  updateStatus(
    id: string,
    status: CorrelationSuggestionStatus,
    reviewedById: string,
  ): Promise<CorrelationSuggestionWithApplications>;
}
