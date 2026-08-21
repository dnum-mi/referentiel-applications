import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PaginatedResponseDto } from "src/common/dto";
import { RelationService } from "../relation.service";
import {
  CorrelationSignalsDto,
  CorrelationSuggestionDto,
  CorrelationSuggestionFilterDto,
  RunCorrelationDetectionResultDto,
} from "./application/dto/correlation-suggestion.dto";
import { CorrelationDetectionService } from "./correlation-detection.service";
import {
  CorrelationSuggestionWithApplications,
  ICorrelationSuggestionRepository,
} from "./infrastructure/repository/correlation-suggestion.repository.interface";

/** Violation de contrainte d'unicité Prisma : la ligne existe déjà. */
function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

@Injectable()
export class CorrelationSuggestionService {
  constructor(
    @Inject("ICorrelationSuggestionRepository")
    private readonly correlationSuggestionRepository: ICorrelationSuggestionRepository,
    private readonly relationService: RelationService,
    private readonly correlationDetectionService: CorrelationDetectionService,
  ) {}

  async find(
    filters: CorrelationSuggestionFilterDto,
  ): Promise<PaginatedResponseDto<CorrelationSuggestionDto>> {
    const { results, total } =
      await this.correlationSuggestionRepository.findAllPaginated(filters);
    return { results: results.map(toCorrelationSuggestionDto), total };
  }

  /**
   * Accepte une suggestion : crée la Relation `is_correlated_with` en passant
   * par RelationService.create (traçabilité Metadata sur les deux fiches),
   * puis passe la suggestion en ACCEPTED avec revieweur et date.
   *
   * La paire de la suggestion étant stockée en ordre canonique, la relation
   * créée respecte la convention d'ordre du type symétrique (#2283).
   * Un second accept (ou l'accept d'une suggestion rejetée) renvoie 409.
   */
  async accept(id: string, userId: string): Promise<CorrelationSuggestionDto> {
    const suggestion = await this.findPendingOrThrow(id);

    try {
      await this.relationService.create(
        suggestion.applicationSourceId,
        {
          applicationTargetId: suggestion.applicationTargetId,
          type: "is_correlated_with",
          mediationServiceId: null,
        },
        userId,
      );
    } catch (error) {
      // La création de la relation et le passage en ACCEPTED ne partagent pas
      // de transaction : si la seconde échoue, la relation reste. Une reprise
      // de l'acceptation bute alors sur la contrainte d'unicité — de même que
      // deux acceptations concurrentes, ou une relation déjà saisie à la main.
      // Dans tous ces cas la relation attendue existe : poursuivre la revue
      // vaut mieux qu'un 500 sur une suggestion devenue inacceptable.
      if (!isUniqueConstraintViolation(error)) throw error;
    }

    const updated = await this.correlationSuggestionRepository.updateStatus(
      id,
      "ACCEPTED",
      userId,
    );
    return toCorrelationSuggestionDto(updated);
  }

  /**
   * Rejette une suggestion sans créer de relation : la paire ne sera plus
   * jamais re-proposée par le moteur de détection (exclusion des revues).
   */
  async reject(id: string, userId: string): Promise<CorrelationSuggestionDto> {
    await this.findPendingOrThrow(id);
    const updated = await this.correlationSuggestionRepository.updateStatus(
      id,
      "REJECTED",
      userId,
    );
    return toCorrelationSuggestionDto(updated);
  }

  /**
   * Déclenche manuellement la détection. 409 si un run est déjà en cours
   * (les exécutions sont sérialisées par le moteur).
   */
  async runDetection(): Promise<RunCorrelationDetectionResultDto> {
    const result = await this.correlationDetectionService.runDetectionSafely();
    if (result === null) {
      throw new ConflictException(
        "Une détection des corrélations est déjà en cours",
      );
    }
    return result;
  }

  private async findPendingOrThrow(
    id: string,
  ): Promise<CorrelationSuggestionWithApplications> {
    const suggestion = await this.correlationSuggestionRepository.findOne(id);
    if (!suggestion) {
      throw new NotFoundException("Suggestion de corrélation non trouvée");
    }
    if (suggestion.status !== "PENDING") {
      throw new ConflictException(
        `Suggestion de corrélation déjà revue (${suggestion.status})`,
      );
    }
    return suggestion;
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
