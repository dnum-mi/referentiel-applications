import { Inject, Injectable } from "@nestjs/common";
import { PaginatedResponseDto } from "src/common/dto";
import {
  CorrelationSignalsDto,
  CorrelationSuggestionDto,
  CorrelationSuggestionFilterDto,
} from "./application/dto/correlation-suggestion.dto";
import {
  CorrelationSuggestionWithApplications,
  ICorrelationSuggestionRepository,
} from "./infrastructure/repository/correlation-suggestion.repository.interface";

@Injectable()
export class CorrelationSuggestionService {
  constructor(
    @Inject("ICorrelationSuggestionRepository")
    private readonly correlationSuggestionRepository: ICorrelationSuggestionRepository,
  ) {}

  async find(
    filters: CorrelationSuggestionFilterDto,
  ): Promise<PaginatedResponseDto<CorrelationSuggestionDto>> {
    const { results, total } =
      await this.correlationSuggestionRepository.findAllPaginated(filters);
    return { results: results.map(toCorrelationSuggestionDto), total };
  }
}

export function toCorrelationSuggestionDto(
  suggestion: CorrelationSuggestionWithApplications,
): CorrelationSuggestionDto {
  return {
    id: suggestion.id,
    applicationSourceId: suggestion.applicationSourceId,
    applicationTargetId: suggestion.applicationTargetId,
    sourceApplication: suggestion.sourceApplication,
    targetApplication: suggestion.targetApplication,
    score: suggestion.score,
    // Colonne Json en base ; la forme est garantie par le moteur de détection
    signals: suggestion.signals as unknown as CorrelationSignalsDto,
    status: suggestion.status,
    createdAt: suggestion.createdAt,
    reviewedById: suggestion.reviewedById,
    reviewedAt: suggestion.reviewedAt,
  };
}
