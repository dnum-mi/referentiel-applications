import { KeycloakService } from '../../src/services/keycloak.service';
import { faker } from '@faker-js/faker';
import { prisma } from './prisma';

const keycloakService = new KeycloakService();

export class UserFaker {
  static async create(permissions: string[] = []) {
    const email = faker.internet.email();
    const username = email;

    const adminToken = await keycloakService.getAdminToken();
    const keycloakUserID = await keycloakService.createUser(adminToken, {
      email: email,
      username: username,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
    });
    let user = await prisma.user.findUnique({
      where: { keycloakId: keycloakUserID },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          keycloakId: keycloakUserID,
          permissions: permissions.join(','), // Convert array to comma-separated string
        },
      });
    }

    return user;
  }
}
