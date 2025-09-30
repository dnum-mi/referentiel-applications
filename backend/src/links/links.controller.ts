import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse } from "@nestjs/swagger";
import { LinksService } from "./links.service";
import { CreateLinkDto, LinkDto } from "./dto/create-link.dto";
import { LinkFiltersDto } from "./dto/link-filters.dto";
import { UserId } from "../common/decorators/user-id.decorator";
import { UpdateLinkDto } from "./dto/update-link.dto";
import { ApplicationService } from "src/product/application.service";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { AppAction } from "src/common/decorators/application.decorator";
import { PaginatedResponseDto } from "src/common/dto";

@ApiTags("Links")
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/links")
export class ApplicationLinksController {
  constructor(
    private readonly service: LinksService,
    private readonly applicationService: ApplicationService,
  ) {}

  @Post()
  @AppAction("writeLinks")
  @ApiOperation({ summary: "Create a new link for an application" })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Link created successfully",
    type: LinkDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async create(
    @UserId() userId: string,
    @Body() createLinkDto: CreateLinkDto,
    @Param("applicationId") applicationId: string,
  ) {
    const createdLink = await this.service.create({
      ...createLinkDto,
      application: {
        connect: {
          id: applicationId,
        },
      },
      metadatas: {
        create: {
          applicationId,
          createdById: userId,
          description: `Ajout du lien : ${createLinkDto.link}`,
        },
      },
    });
    await this.applicationService.updateApplicationQuality(applicationId);
    return createdLink;
  }

  @Get()
  @AppAction("readLinks")
  @ApiOperation({
    summary: "Retrieve links for an application",
    description: "Get list of links for an application",
  })
  @ApiOkResponse({
    description: "List of links for the application",
    type: PaginatedResponseDto<LinkDto>,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  findAll(
    @Param("applicationId") applicationId: string,
    @Query() filters: LinkFiltersDto,
  ): Promise<PaginatedResponseDto<LinkDto>> {
    return this.service.find({ ...filters, applicationId });
  }

  @Patch(":id")
  @AppAction("writeLinks")
  @ApiOperation({ summary: "Update a link for an application" })
  @ApiOkResponse({ description: "Link updated successfully", type: LinkDto })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  @ApiParam({ name: "id", description: "ID of the link to update" })
  update(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
    @Body() updateLinkDto: UpdateLinkDto,
  ) {
    return this.service.updateWithMetadata({
      id,
      data: updateLinkDto,
      userId,
      applicationId,
      gender: "du lien",
      entityName: "externalRessourceId",
      metadataFields: {
        link: "lien",
        type: "type",
        description: "description",
      },
      getName: entity => entity.link,
      triggerQualityUpdate: true,
    });
  }

  @Delete(":id")
  @AppAction("writeLinks")
  @ApiOperation({ summary: "Delete a link for an application" })
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Link deleted successfully" })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  @ApiParam({ name: "id", description: "ID of the link to delete" })
  delete(
    @UserId() userId: string,
    @Param("applicationId") applicationId: string,
    @Param("id") id: string,
  ) {
    return this.service.deleteWithMetadata({
      id,
      userId,
      applicationId,
      gender: "du lien",
      name: "link",
      triggerQualityUpdate: true,
    });
  }
}
