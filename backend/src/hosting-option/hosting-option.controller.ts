import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
} from "@nestjs/common";
import { HostingOptionService } from "./hosting-option.service";
import {
  CreateHostingOptionDto,
  UpdateHostingOptionDto,
  HostingOptionFiltersDto,
  HostingOptionDto,
} from "./dto/hosting-option.dto";
import { ApiOperation, ApiTags, ApiCreatedResponse, ApiOkResponse, ApiNoContentResponse, ApiNotFoundResponse } from "@nestjs/swagger";

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

  @Get("sites")
  @ApiOperation({ summary: "Get all distinct site values" })
  @ApiOkResponse({
    description: "List of distinct sites",
    type: String,
    isArray: true,
  })
  findDistinctSites() {
    return this.hostingOptionService.findDistinctSites();
  }

  @Get("platforms")
  @ApiOperation({ summary: "Get all distinct platform values" })
  @ApiOkResponse({
    description: "List of distinct platforms",
    type: String,
    isArray: true,
  })
  findDistinctPlatforms() {
    return this.hostingOptionService.findDistinctPlatforms();
  }

  @Get("providers")
  @ApiOperation({ summary: "Get all distinct provider values" })
  @ApiOkResponse({
    description: "List of distinct providers",
    type: String,
    isArray: true,
  })
  findDistinctProviders() {
    return this.hostingOptionService.findDistinctProviders();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get hosting option by ID" })
  @ApiOkResponse({
    description: "Hosting option found",
    type: HostingOptionDto,
  })
  @ApiNotFoundResponse({ description: "Hosting option not found" })
  findOne(@Param("id") id: string) {
    return this.hostingOptionService.findOne(id);
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
