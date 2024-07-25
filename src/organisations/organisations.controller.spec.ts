import { INestApplication } from '@nestjs/common';
import { OrganisationsController } from './organisations.controller';
import { setupTestModule, teardownTestModule } from '../test-setup';
import * as request from 'supertest';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { v4 as uuidv4 } from 'uuid';
import { OrganisationsService } from './organisations.service';
import { OrgOrganisationunit } from '@prisma/client';

describe('OrganisationsController', () => {
  let app: INestApplication;
  let controller: OrganisationsController;
  let service: OrganisationsService;
  let organisation: OrgOrganisationunit;
  const uuid = uuidv4();

  beforeAll(async () => {
    app = await setupTestModule();

    controller = app.get<OrganisationsController>(OrganisationsController);
    service = app.get<OrganisationsService>(OrganisationsService);

    organisation = (await service.create('Testing', {
      label: 'testlabel',
      description: 'testdescription',
      organisationcode: 'MA   ',
    }))!;
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should give 404 if GET /organisations requested with invalid idOrganisation', async () => {
    return request(app.getHttpServer())
      .get(`/organisations/${uuid}`)
      .expect(404);
  });

  it(`should return the Organisation in question, when request GET /organisations with valid idOrganisation param`, async () => {
    return request(app.getHttpServer())
      .get(`/organisations/${organisation.organisationunitid}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.organisationunitid).toEqual(
          organisation.organisationunitid,
        );
      });
  });

  it(`shouldn't create organisation by calling POST /organisations with  invalid request data`, async () => {
    const neworganisationData: CreateOrganisationDto = {
      label: '',
      organisationcode: '',
      description: '',
    };

    return request(app.getHttpServer())
      .post(`/organisations`)
      .send(neworganisationData)
      .expect(400);
  });

  it(`should create organisation by calling POST /organisations with valid request data`, async () => {
    const neworganisationData: CreateOrganisationDto = {
      label: 'newlabel',
      organisationcode: 'MA   ',
      description: 'description',
    };

    const response = await request(app.getHttpServer())
      .post(`/organisations`)
      .send(neworganisationData)
      .expect(201);

    expect(response.body).toEqual(expect.objectContaining(neworganisationData));
  });

  it(`shouldn't update organisation by calling PUT /organisations with idOrganisation param, and invalid request data`, async () => {
    const neworganisationData: UpdateOrganisationDto = {
      label: '',
      organisationcode: '',
      description: '',
    };

    return request(app.getHttpServer())
      .put(`/organisations/${organisation.organisationunitid}`)
      .send(neworganisationData)
      .expect(400);
  });

  it(`should update organisation by calling PUT /organisations with idOrganisation param, and valid request data`, async () => {
    const neworganisationData: UpdateOrganisationDto = {
      label: 'newlabel',
      organisationcode: 'MA   ',
      description: 'description',
    };

    const response = await request(app.getHttpServer())
      .put(`/organisations/${organisation.organisationunitid}`)
      .send(neworganisationData);

    expect(response.body).toEqual(expect.objectContaining(neworganisationData));
  });
});
