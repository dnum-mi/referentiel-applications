import session from 'express-session';
import Keycloak from 'keycloak-connect';
import * as dotenv from 'dotenv';

dotenv.config();

const keycloakConfig = {
  'confidential-port': 0,
  'auth-server-url': process.env.KEYCLOAK_SERVER_URL!,
  realm: process.env.KEYCLOAK_REALM!,
  resource: process.env.KEYCLOAK_CLIENT_ID!,
  'ssl-required': 'external',
  bearerOnly: true,
  credentials: {
    secret: process.env.KEYCLOAK_CLIENT_SECRET!,
  },
};

const memoryStore = new session.MemoryStore();
const keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);

export { keycloak, memoryStore };
