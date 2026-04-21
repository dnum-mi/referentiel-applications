import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
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
  CreateTechnicalDebtInfoDto,
  TechnicalDebtInfoDto,
} from "./dto/create-technical-debt-info.dto";
import { TechnicalDebtInfoService } from "./technical-debt-info.service";
import { PaginatedResponseDto, PaginationDto } from "src/common/dto";

@ApiTags("Technical Debt Info")
@UseGuards(PermissionGuard)
@Controller("applications/:applicationId/technical-debt-info")
export class ApplicationTechnicalDebtInfoController {
  constructor(
    private readonly technicalDebtInfoService: TechnicalDebtInfoService,
  ) {}

  @Post()
  @RequiredPermissions([Permission.AppWrite])
  @ApiOperation({ summary: "Create technical debt info for an application" })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Technical debt info created successfully",
    type: TechnicalDebtInfoDto,
  })
  @ApiConflictResponse({
    description: "Technical debt info already exists for this application",
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async create(
    @UserId() userId: string,
    @Body() createDto: CreateTechnicalDebtInfoDto,
    @Param("applicationId") applicationId: string,
  ) {
    return await this.technicalDebtInfoService.create(
      {
        ...createDto,
        application: {
          connect: {
            id: applicationId,
          },
        },
      },
      {
        applicationId,
        metadata: {
          userId,
          gender: "des informations de dette technique",
          entity: "technicalDebtInfoId",
        },
      },
    );
  }

  @Get()
  @RequiredPermissions([Permission.AppRead])
  @ApiOperation({
    summary: "Retrieve the technical debt info for an application",
  })
  @ApiOkResponse({
    description: "Technical debt info found successfully",
    type: PaginatedResponseDto.of(TechnicalDebtInfoDto),
  })
  @ApiParam({ name: "applicationId", description: "ID of the application" })
  async find(
    @Param("applicationId") applicationId: string,
    @Query() filters: PaginationDto,
  ) {
    const { page, pageSize } = filters;
    const result = await this.technicalDebtInfoService.findByApplicationId(
      applicationId,
      { page, pageSize },
    );
    if (!result?.results?.length) {
      throw new NotFoundException(
        "No technical debt info found for this application",
      );
    }
    return result;
  }
}
