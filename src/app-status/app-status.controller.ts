import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { AppStatusService } from './app-status.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { CreateAppStatusDto } from './dto/create-app-status.dto';
import { UpdateAppStatusDto } from './dto/update-app-status.dto';

@ApiTags('Application Status')
@Controller('app-status')
export class AppStatusController {
  constructor(private readonly appStatusService: AppStatusService) {}

  @Get()
  getAllStatuses() {
    return this.appStatusService.getAllStatuses();
  }

  @Get(':id')
  getStatusById(@Param('id') id: string) {
    return this.appStatusService.getStatusById(id);
  }

  @Post()
  @ApiBody({ type: CreateAppStatusDto })
  createStatus(@Body() body: { applicationstatuscode: string; label: string }) {
    return this.appStatusService.createStatus(body);
  }

  @Put(':id')
  @ApiBody({ type: UpdateAppStatusDto })
  updateStatus(@Param('id') id: string, @Body() body: { label: string }) {
    return this.appStatusService.updateStatus(id, body);
  }

  @Delete(':id')
  deleteStatus(@Param('id') id: string) {
    return this.appStatusService.deleteStatus(id);
  }
}
