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
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AppAction } from "src/common/decorators/application.decorator";
import { ApplicationGuard } from "src/common/guards/application.guard";
import { UserId } from "../common/decorators/user-id.decorator";
import {
  CreateLinkDto,
  LinkDto,
  LinkFiltersDto,
  LinkSearchResultDto,
  UpdateLinkDto,
} from "./dto/links.dto";
import { LinksService } from "./links.service";

@ApiTags("Links")
@UseGuards(ApplicationGuard)
@Controller("applications/:applicationId/links")
export class ApplicationLinksController {
  constructor(private readonly service: LinksService) {}

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
    return await this.service.create(
      {
        ...createLinkDto,
        application: {
          connect: { id: applicationId },
        },
      },
      {
        applicationId,
        triggerQualityUpdate: true,
        metadata: {
          userId,
          gender: "du lien",
          getColumn: (entity) => entity.link,
          entity: "externalRessourceId",
        },
      },
    );
  }

  @Get()
  @AppAction("readLinks")
  @ApiOperation({
    summary: "Retrieve links for an application",
    description: "Get list of links for an application",
  })
  @ApiOkResponse({
    description: "List of links for the application",
    type: LinkSearchResultDto,
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  findAll(
    @Param("applicationId") applicationId: string,
    @Query() filters: LinkFiltersDto,
  ): Promise<LinkSearchResultDto> {
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
    return this.service.update(id, updateLinkDto, {
      applicationId,
      triggerQualityUpdate: true,
      metadata: {
        userId,
        gender: "du lien",
        getColumn: (entity) => entity.link,
        entity: "externalRessourceId",
        fields: {
          link: "lien",
          type: "type",
          description: "description",
        },
      },
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
    return this.service.delete(id, {
      applicationId,
      triggerQualityUpdate: true,
      metadata: {
        userId,
        gender: "du lien",
        getColumn: (entity) => entity.link,
        entity: "externalRessourceId",
      },
    });
  }
}
