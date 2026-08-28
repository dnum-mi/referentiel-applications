/**
 * Échappe les caractères HTML dangereux d'une valeur destinée à être insérée dans un document HTML
 * (corps d'email, notamment). Empêche l'injection de balises via du contenu utilisateur (#2380).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
