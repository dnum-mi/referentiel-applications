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
import { Permission } from "@prisma/client";
import { RequiredPermissions } from "src/common/decorators/required-permissions.decorator";
import { PermissionGuard } from "src/common/guards/permission.guard";
import { UserId } from "../common/decorators/user-id.decorator";
import {
  CreateLinkDto,
  LinkDto,
  LinkFiltersDto,
  UpdateLinkDto,
} from "./dto/links.dto";
import { LinksService } from "./links.service";
import { PaginatedResponseDto } from "src/common/dto";

@ApiTags("Links")
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/links")
export class ApplicationLinksController {
  constructor(private readonly service: LinksService) {}

  @Post()
  @RequiredPermissions([Permission.LinkWrite])
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
    return this.service.createLink(applicationId, createLinkDto, userId);
  }

  @Get()
  @RequiredPermissions([Permission.LinkRead])
  @ApiOperation({
    summary: "Retrieve links for an application",
    description: "Get list of links for an application",
  })
  @ApiOkResponse({
    description: "List of links for the application",
    type: PaginatedResponseDto.of(LinkDto),
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  findAll(
    @Param("applicationId") applicationId: string,
    @Query() filters: LinkFiltersDto,
  ) {
    return this.service.find({ ...filters, applicationId });
  }

  @Patch(":id")
  @RequiredPermissions([Permission.LinkWrite])
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
    return this.service.updateLink(id, applicationId, updateLinkDto, userId);
  }

  @Delete(":id")
  @RequiredPermissions([Permission.LinkWrite])
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
    return this.service.deleteLink(id, applicationId, userId);
  }
}
