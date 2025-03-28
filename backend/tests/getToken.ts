export async function getToken(user) {
  const response = await fetch(
    'http://keycloak:8080/realms/referentiel-applications/protocol/openid-connect/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: 'referentiel-applications',
        grant_type: 'password',
        username: user.email,
        password: 'password', // Assuming the password is the same for all test users
      }),
    },
  );

  const data = await response.json();
  return data.access_token;
}
