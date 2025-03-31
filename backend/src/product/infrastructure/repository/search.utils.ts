import { Prisma, priorityRestart } from '@prisma/client';

const accentFrom = 'àáâãäåèéêëìíîïòóôõöùúûüç';
const accentTo = 'aaaaaaeeeeiiiiooooouuuuc';
const ALLOWED_PRIORITIES = Object.values(priorityRestart);

export function buildLabelFilter(label?: string): Prisma.Sql[] {
  if (!label) return [];

  const pattern = `%${label.toLowerCase()}%`;
  return [
    Prisma.sql`
      EXISTS (
        SELECT 1
        FROM public.labels l
        WHERE (
          translate(lower(l.value), ${accentFrom}, ${accentTo}) 
            ILIKE translate(${pattern}, ${accentFrom}, ${accentTo})
          OR translate(lower(l.shortname), ${accentFrom}, ${accentTo}) 
            ILIKE translate(${pattern}, ${accentFrom}, ${accentTo})
        )
        AND l."applicationId" = a.id
      )
    `,
  ];
}

export function buildTagFilters(tags?: string[]): Prisma.Sql[] {
  if (!tags?.length) return [];

  return tags.map((t) => {
    const pattern = `%${t.toLowerCase()}%`;
    return Prisma.sql`
      EXISTS (
        SELECT 1 FROM unnest(a.tags) AS t
        WHERE translate(lower(t), ${accentFrom}, ${accentTo})
          ILIKE translate(${pattern}, ${accentFrom}, ${accentTo})
      )
    `;
  });
}

export function buildPriorityFilter(priority?: priorityRestart): Prisma.Sql[] {
  if (!priority || !ALLOWED_PRIORITIES.includes(priority)) return [];

  return [
    Prisma.sql`a."priorityRestart" = ${Prisma.raw(`CAST('${priority}' AS "priorityRestart")`)}`,
  ];
}

export function buildShortNameFilter(shortName?: string): Prisma.Sql[] {
  if (!shortName) return [];

  const pattern = `%${shortName.toLowerCase()}%`;
  return [Prisma.sql`lower(a."shortName") ILIKE ${pattern}`];
}
