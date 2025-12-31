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
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  CreateHostingOptionDto,
  HostingOptionDto,
  HostingOptionFiltersDto,
  UpdateHostingOptionDto,
} from "./dto/hosting-option.dto";
import { HostingOptionService } from "./hosting-option.service";

@ApiTags("HostingOptions")
@Controller("hosting-options")
export class HostingOptionController {
  constructor(private readonly hostingOptionService: HostingOptionService) {}

  @Post()
  @ApiOperation({ summary: "Create a new hosting option" })
  @HttpCode(201)
  @ApiCreatedResponse({
    description: "Hosting option created successfully",
    type: HostingOptionDto,
  })
  create(@Body() createHostingOptionDto: CreateHostingOptionDto) {
    return this.hostingOptionService.create(createHostingOptionDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all hosting options with optional filtering" })
  @ApiOkResponse({
    description: "List of hosting options",
    type: HostingOptionDto,
    isArray: true,
  })
  findAll(@Query() filters: HostingOptionFiltersDto) {
    return this.hostingOptionService.findAll(filters);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update hosting option by ID" })
  @ApiOkResponse({
    description: "Hosting option updated successfully",
    type: HostingOptionDto,
  })
  @ApiNotFoundResponse({ description: "Hosting option not found" })
  update(
    @Param("id") id: string,
    @Body() updateHostingOptionDto: UpdateHostingOptionDto,
  ) {
    return this.hostingOptionService.update(id, updateHostingOptionDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete hosting option by ID" })
  @HttpCode(204)
  @ApiNoContentResponse({
    description: "Hosting option deleted successfully",
  })
  @ApiNotFoundResponse({
    description: "Hosting option not found",
  })
  remove(@Param("id") id: string) {
    return this.hostingOptionService.delete(id);
  }
}
