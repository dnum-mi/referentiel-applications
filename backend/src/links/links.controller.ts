import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { AppAction } from "src/common/decorators/application.decorator";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { ApplicationService } from "src/product/application.service";
import { UserId } from "../common/decorators/user-id.decorator";
import { CreateLinkDto, LinkDto, LinkFiltersDto, LinksPaginatedResponseDto, UpdateLinkDto } from "./dto/links.dto";
import { LinksService } from "./links.service";

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
    type: LinksPaginatedResponseDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  findAll(
    @Param("applicationId") applicationId: string,
    @Query() filters: LinkFiltersDto,
  ): Promise<LinksPaginatedResponseDto> {
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
