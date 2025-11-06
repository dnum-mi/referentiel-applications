export function sanitizeLabel(label?: string | null): string {
  return (label ?? "").toString().replace(/"/g, "&quot;").replace(/\n/g, " ");
}

export function sanitizeNodeId(id: string): string {
  return `node_${id.replace(/[^a-z0-9]/gi, "_")}`;
}
