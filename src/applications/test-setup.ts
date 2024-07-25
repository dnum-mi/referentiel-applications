import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { SensibiliteEnum } from './enums/app-sensibilite';
import { StatutEnum } from './enums/app-status';

export async function createApp(
  service: ApplicationsService,
  organisation: string = '612429c4-120d-47f2-9b49-0bec44780a51',
  overrides?: Partial<CreateApplicationDto>,
) {
  return await service.updateOrCreate(
    'Testing',
    {
      ...{
        longname: 'some name',
        description: 'testdescription',
        status: StatutEnum['En construction'],
        apptype: 'WBEXT',
        sensitivity: SensibiliteEnum.Sensible,
        organisationunitid: organisation,
      },
      ...overrides,
    },
    true,
    '97a5cf37-b5ac-4a2c-9a2a-6d567a80e544',
  );
}
