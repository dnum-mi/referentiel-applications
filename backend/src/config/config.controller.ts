import {
  Controller,
  Get,
} from "@nestjs/common";
import { ConfigService } from "./config.service";
import { ConfigDto } from "./dto/config.dto";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Config")
@Controller("config")
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get("")
  @ApiOperation({
    operationId: "getConfig",
    summary: "Récupérer la configuration du client",
  })
  @ApiOkResponse({
    description: "Configuration du client",
    type: ConfigDto,
  })
  public countAllConfigs(): ConfigDto {
    return this.configService.getFrontendConfig();
  }
}
