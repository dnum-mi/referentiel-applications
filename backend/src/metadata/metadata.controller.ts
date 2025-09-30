import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
} from "@nestjs/swagger";
import { MetadataService } from "./metadata.service";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { AppAction } from "src/common/decorators/application.decorator";
import { FirstLastMetadataDto, MetadataDto, MetadataFiltersDto } from "./dto/metadata.dto";
import { PaginatedResponseDto } from "src/common/dto";

@ApiTags("Metadatas")
@Controller("metadatas")
export class MetadatasController {
  constructor(private readonly metadataService: MetadataService) { }

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les metadatas" })
  @ApiOkResponse({
    description: "Récupérer toutes les metadatas",
    type: PaginatedResponseDto<MetadataDto>,
  })
  public async find(@Query() filters: MetadataFiltersDto): Promise<PaginatedResponseDto<MetadataDto>> {
    return this.metadataService.find(filters);
  }
}

@ApiTags("Metadatas")
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/metadatas")
export class ApplicationMetadataController {
  constructor(private readonly metadataService: MetadataService) { }

  @Get()
  @AppAction("readMetadata")
  @ApiOperation({ summary: "Récupérer toutes les metadatas d'une application" })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiOkResponse({
    description: "Liste des metadatas",
    type: PaginatedResponseDto<MetadataDto>,
  })
  public async find(
    @Param("applicationId") applicationId: string,
    @Query() filters: MetadataFiltersDto,
  ): Promise<PaginatedResponseDto<MetadataDto>> {
    return this.metadataService.find({ ...filters, applicationId });
  }

  @Get("first-last")
  @UseGuards(ApplicationGuard)
  @AppAction("readMetadata")
  @ApiOperation({
    summary: "Retourne la première et la dernière metadata d'une application",
  })
  @ApiParam({ name: "applicationId", description: "ID de l'application" })
  @ApiOkResponse({
    description: "La première et la dernière metadata",
    type: FirstLastMetadataDto,
  })
  async getFirstAndLastMetadata(
        @Param("applicationId") applicationId: string,
  ): Promise<FirstLastMetadataDto> {
    return this.metadataService.getFirstAndLastMetadata(applicationId);
  }
}
