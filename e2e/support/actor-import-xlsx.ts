import ExcelJS from "exceljs";

/**
 * Génère un classeur Excel au format de l'export RefApp pour l'import d'acteurs.
 *
 * Les en-têtes reproduisent **à l'identique** les libellés de l'onglet « Acteurs » de l'export
 * (cf. `backend/src/applications/columnLabels/application-export.columnLabels.ts`). Le service
 * d'import retrouve les colonnes par ces libellés ; une ligne avec « ID Acteur » met à jour
 * l'acteur correspondant, sinon un acteur est créé.
 */
export interface ActorImportRow {
  /** « ID Acteur » — vide pour une création, renseigné pour une mise à jour. */
  id?: string;
  /** « ID Application » — application de rattachement (obligatoire). */
  applicationId: string;
  firstname?: string;
  lastname?: string;
  /** « Rôle » — code du type d'acteur (ex. « MOA »). */
  role?: string;
  /** « Type » — libellé du type d'acteur (résolution de repli si le code est absent). */
  type?: string;
  email?: string;
}

const ACTORS_SHEET = "Acteurs";
const HEADERS = [
  "ID Application",
  "Application",
  "ID Acteur",
  "Prénom de l’acteur",
  "Nom de l’acteur",
  "Rôle",
  "Type",
  "Email",
] as const;

export async function buildActorImportWorkbook(
  rows: ActorImportRow[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(ACTORS_SHEET);
  sheet.addRow([...HEADERS]);

  for (const row of rows) {
    sheet.addRow([
      row.applicationId,
      "",
      row.id ?? "",
      row.firstname ?? "",
      row.lastname ?? "",
      row.role ?? "",
      row.type ?? "",
      row.email ?? "",
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
