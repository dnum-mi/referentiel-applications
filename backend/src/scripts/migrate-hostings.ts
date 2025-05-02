import { PrismaClient } from '@prisma/client';

/**
 * Ce script migre les données d'hébergement depuis l'ancienne structure plate
 * vers la nouvelle structure normalisée utilisant les tables Provider, Platform et HostingSite
 */
async function migrateHostingData() {
  console.log("Démarrage de la migration des données d'hébergement...");

  const prisma = new PrismaClient();

  try {
    // Étape 1: Récupérer tous les hébergements existants
    const hostings = await prisma.hosting.findMany();
    console.log(
      `${hostings.length} enregistrements d'hébergement trouvés à migrer.`,
    );

    // Étape 2: Extraire les providers, platforms et sites uniques
    const uniqueProviders = new Map<string, string>(); // name -> id
    const uniquePlatforms = new Map<
      string,
      { id: string; providerId: string; hostingSiteId: string }
    >();
    const uniqueSites = new Map<string, string>(); // name -> id

    // Valeurs par défaut pour les enregistrements sans données
    let nonDefiniProviderId = '';
    let nonDefiniSiteId = '';

    // Étape 3: Créer les providers
    console.log('Création des providers...');
    const nonDefiniProvider = await prisma.provider.create({
      data: {
        name: 'NON DEFINI',
        description: 'Provider not defined in legacy data',
      },
    });
    nonDefiniProviderId = nonDefiniProvider.id;
    uniqueProviders.set('NON DEFINI', nonDefiniProvider.id);

    for (const hosting of hostings) {
      if (hosting.provider && !uniqueProviders.has(hosting.provider)) {
        const provider = await prisma.provider.create({
          data: {
            name: hosting.provider,
          },
        });
        uniqueProviders.set(hosting.provider, provider.id);
        console.log(`Provider créé: ${hosting.provider}`);
      }
    }

    // Étape 4: Créer les sites d'hébergement
    console.log("Création des sites d'hébergement...");
    const nonDefiniSite = await prisma.hostingSite.create({
      data: {
        name: 'NON DEFINI',
        description: 'Site non défini dans les données existantes',
      },
    });
    nonDefiniSiteId = nonDefiniSite.id;
    uniqueSites.set('NON DEFINI', nonDefiniSite.id);

    for (const hosting of hostings) {
      if (hosting.site && !uniqueSites.has(hosting.site)) {
        // Extraire le bâtiment et la salle si ils existent
        const [name, buildingRoom] = hosting.site.split(' - ');
        let building = null;
        let room = null;

        if (buildingRoom) {
          const parts = buildingRoom.split(' / ');
          building = parts[0] || null;
          room = parts[1] || null;
        }

        const site = await prisma.hostingSite.create({
          data: {
            name: name || hosting.site,
            building,
            room,
          },
        });
        uniqueSites.set(hosting.site, site.id);
        console.log(`Site d'hébergement créé: ${hosting.site}`);
      }
    }

    // Étape 5: Créer les platforms
    console.log('Création des platforms...');
    for (const hosting of hostings) {
      const platformKey = `${hosting.platform || 'NON DEFINI'}_${hosting.provider || 'NON DEFINI'}_${hosting.site || 'NON DEFINI'}`;

      if (!uniquePlatforms.has(platformKey)) {
        const providerId =
          uniqueProviders.get(hosting.provider || 'NON DEFINI') ||
          nonDefiniProviderId;
        const hostingSiteId =
          uniqueSites.get(hosting.site || 'NON DEFINI') || nonDefiniSiteId;

        const platform = await prisma.platform.create({
          data: {
            name: hosting.platform || 'NON DEFINI',
            providerId,
            hostingSiteId,
          },
        });

        uniquePlatforms.set(platformKey, {
          id: platform.id,
          providerId,
          hostingSiteId,
        });
        console.log(
          `Platform créée: ${hosting.platform || 'NON DEFINI'} pour provider ${hosting.provider || 'NON DEFINI'} et site ${hosting.site || 'NON DEFINI'}`,
        );
      }
    }

    // Étape 6: Mettre à jour les hébergements pour référencer les nouvelles entités
    console.log("Mise à jour des enregistrements d'hébergement...");
    for (const hosting of hostings) {
      const platformKey = `${hosting.platform || 'NON DEFINI'}_${hosting.provider || 'NON DEFINI'}_${hosting.site || 'NON DEFINI'}`;
      const platform = uniquePlatforms.get(platformKey);

      if (platform) {
        await prisma.hosting.update({
          where: { id: hosting.id },
          data: {
            platformId: platform.id,
          },
        });
        console.log(
          `Hébergement ${hosting.id} mis à jour pour référencer la platform ${platform.id}`,
        );
      } else {
        console.warn(
          `Impossible de trouver une platform correspondante pour l'hébergement ${hosting.id}`,
        );
      }
    }

    console.log('Migration terminée avec succès!');
    console.log(
      `Créés: ${uniqueProviders.size} providers, ${uniqueSites.size} sites d'hébergement et ${uniquePlatforms.size} platforms`,
    );
    console.log(`${hostings.length} enregistrements d'hébergement mis à jour.`);
  } catch (error) {
    console.error('Erreur durant la migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateHostingData()
  .then(() => {
    console.log('Script de migration terminé.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Échec du script de migration:', err);
    process.exit(1);
  });
