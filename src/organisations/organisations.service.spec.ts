import { OrganisationsService } from './organisations.service';
import { setupTestModule, teardownTestModule } from '../test-setup';
import { INestApplication } from '@nestjs/common';

import { Organisation } from './entities/organisation.entity';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';

describe('OrganisationsService', () => {
  let app: INestApplication;
  let service: OrganisationsService;
  let organisation: Organisation;

  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<OrganisationsService>(OrganisationsService);

    organisation = (await service.create('Testing', {
      label: 'testlabel',
      description: 'testdescription',
      organisationcode: 'MA   ',
    }))!;
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be able to select organisation by idOrganisation', async () => {
    const selectedOrganisation = await service.getOneById(
      organisation.organisationunitid,
    );

    expect(organisation).toEqual(selectedOrganisation);
  });

  it('should be able to create Organisation', async () => {
    const dtoData: CreateOrganisationDto = {
      description: 'newdescription',
      label: 'newlabel',
      organisationcode: 'SA',
    };

    const organisation: Organisation = (await service.create(
      'Testing',
      dtoData,
    ))!;

    expect(organisation).toBeDefined();
    expect(organisation?.description).toEqual(dtoData.description);
    expect(organisation?.label).toEqual(dtoData.label);
  });

  it('should be able to update Organisation by idOrganisation', async () => {
    const newOrganisationData: UpdateOrganisationDto = {
      description: 'newdescription',
      label: 'newlabel',
      organisationcode: 'SA',
    };

    const updatedOrganisation = await service.updateOneById(
      'Testing',
      organisation.organisationunitid,
      newOrganisationData,
    );
    expect(updatedOrganisation).toBeDefined();

    expect(updatedOrganisation?.description).toEqual(
      newOrganisationData.description,
    );
    expect(updatedOrganisation?.label).toEqual(newOrganisationData.label);
  });
});
