import { Injectable } from '@nestjs/common';

@Injectable()
export class KeycloakService {
  private keycloakBaseUrl = 'http://keycloak:8080';
  private adminRealm = 'master';
  private realmName = 'referentiel-applications';
  private adminClientId = 'admin-cli';
  private adminUsername = 'admin';
  private adminPassword = 'password';

  async getAdminToken(): Promise<string> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/realms/${this.adminRealm}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.adminClientId,
          grant_type: 'password',
          username: this.adminUsername,
          password: this.adminPassword,
        }),
      },
    );

    const data = await response.json();
    return data.access_token;
  }

  async createUser(adminToken: string, userData: any): Promise<string> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/admin/realms/${this.realmName}/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          ...userData,
          enabled: true,
          emailVerified: true,
          credentials: [
            { type: 'password', value: 'password', temporary: false },
          ],
        }),
      },
    );

    const locationHeader = response.headers.get('Location');
    return locationHeader ? locationHeader.split('/').pop() || '' : '';
  }
}
