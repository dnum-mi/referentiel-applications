import { ActeursService } from './acteurs.service';
import { setupTestModule, teardownTestModule } from '../test-setup';

import { INestApplication } from '@nestjs/common';
import { ActActor } from '@prisma/client';
import { UpdateActeurDto } from './dto/update-acteur.dto';

describe('ActeursService', () => {
  let app: INestApplication;
  let service: ActeursService;
  let acteur: ActActor | null;

  beforeAll(async () => {
    app = await setupTestModule();

    service = app.get<ActeursService>(ActeursService);
    acteur = await service.create('Testing', {
      name: 'test',
      email: 'test@test.com',
    });
  });

  afterAll(async () => await teardownTestModule(app));

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should be able to select Acteur by acteurId', async () => {
    const selectedActeur = await service.getOneById(acteur!.actorid);

    expect(acteur).toEqual(selectedActeur);
  });

  it('should be able to update Acteur by acteurId', async () => {
    const newActeurData: UpdateActeurDto = {
      name: 'newtest',
      email: 'newtest',
    };

    acteur = await service.updateOneById(
      'Testing',
      acteur!.actorid,
      newActeurData,
    );

    expect(acteur?.name).toEqual(newActeurData.name);
    expect(acteur?.email).toEqual(newActeurData.email);
  });
});
