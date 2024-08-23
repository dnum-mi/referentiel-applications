import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SensibiliteEnum } from './enums/app-sensibilite';
import { StatutEnum } from './enums/app-status';

export async function createApp(
  service: ApplicationsService,
  organisation: string = '612429c4-120d-47f2-9b49-0bec44780a51',
  overrides?: Partial<CreateApplicationDto>,
  applicationId?: string,
) {
  const applicationData: CreateApplicationDto = {
    longname: overrides?.longname ?? 'default name',
    description: overrides?.description ?? 'default description',
    typeApplication: overrides?.typeApplication ?? 'WBEXT',
    codeApplication: overrides?.codeApplication ?? [],
    sensibilite: overrides?.sensibilite ?? SensibiliteEnum.Sensible,
    statut: overrides?.statut ?? StatutEnum['En construction'],
    organisationid: overrides?.organisationid ?? organisation,
    // autres propriétés
  };

  if (applicationId) {
    return await service.updateApplication(
      'Testing',
      applicationId,
      applicationData,
    );
  } else {
    return await service.createApplication('Testing', applicationData);
  }
}
