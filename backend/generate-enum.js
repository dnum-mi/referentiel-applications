// scripts/generate-enums.mjs

import { promises as fs } from 'fs';
import path from 'path';

// Définitions des énumérations
const enums = {
  ComplianceType: [
    'DIMA = "DIMA"',
    'PDMA = "PDMA"',
    'HOMOLOGATION = "HOMOLOGATION"',
    'RGAA = "RGAA"',
    'DSFR = "DSFR"',
    'RGPD = "RGPD"',
  ],
  ReferenceRepositoryType: [
    'ORGANIZATION = "organization"',
    'APPLICATION = "application"',
    'REGULATION = "regulation"',
    'FINANCIAL = "financial"',
    'POPULATION = "population"',
  ],
  ReferenceRepositoryValueType: [
    'URL = "url"',
    'URI = "uri"',
    'TYPE = "identifier"',
    'NAME = "name"',
  ],
};

// Fonction pour générer un fichier d'énumération
const generateEnumFile = async (enumName, enumValues) => {
  const enumContent = `
export enum ${enumName} {
  ${enumValues.join(',\n  ')}
}
`.trim();

  const filePath = path.join(
    process.cwd(),
    'src',
    'enums',
    `${enumName.toLowerCase()}.enum.ts`,
  );

  await fs.writeFile(filePath, enumContent);
  console.log(`Generated ${filePath}`);
};

// Générer tous les fichiers d'énumérations
const generateEnums = async () => {
  for (const [enumName, enumValues] of Object.entries(enums)) {
    await generateEnumFile(enumName, enumValues);
  }
};

generateEnums().catch((err) => {
  console.error('Error generating enums:', err);
});
