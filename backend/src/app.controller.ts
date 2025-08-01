import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiOkResponse, ApiOperation } from "@nestjs/swagger";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("/")
  @ApiOperation({
    summary: "Get application greeting",
    description: "Returns a simple greeting message from the application.",
  })
  @ApiOkResponse({
    description: "Returns a greeting message.",
    type: String,
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
