import {
    Controller,
    Get,
    Param,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger';
import { MetadataService } from "./metadata.service";
import { Metadata } from '@prisma/client';
import { ApplicationGuard } from 'src/common/guards/application.guard';
import { AppAction } from 'src/common/decorators/application.decorator';

@ApiTags('Metadatas')
@UseGuards(ApplicationGuard)
@Controller('applications/:applicationId/metadatas')
export class ApplicationMetadataController {
    constructor(private readonly metadataService: MetadataService) { }

    @Get()
    @AppAction('readMetadata')
    @ApiOperation({ summary: 'Récupérer toutes les metadatas d\'une application' })
    @ApiParam({ name: 'applicationId', description: "ID de l'application" })
    @ApiResponse({ status: 200, description: 'Liste des metadatas' })
    public async findAll(
        @Param('applicationId') applicationId: string,
    ): Promise<Metadata[]> {
        return this.metadataService.findAll(applicationId);
    }

    @Get('first-last')
    @UseGuards(ApplicationGuard)
    @AppAction('readMetadata')
    @ApiOperation({
        summary: 'Retourne la première et la dernière metadata d\'une application',
    })
    @ApiParam({ name: 'applicationId', description: "ID de l'application" })
    @ApiResponse({
        status: 200,
        description: 'La première et la dernière metadata',
    })
    async getFirstAndLastMetadata(
        @Param('applicationId') applicationId: string,
    ): Promise<{ first: Metadata | null; last: Metadata | null }> {
        return this.metadataService.getFirstAndLastMetadata(applicationId);
    }
}