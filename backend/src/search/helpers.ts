import { Prisma } from '@prisma/client';

type SqlFilterInput = {
  column: string;
  value?: string;
  operator?: 'LIKE' | '=';
  lowercase?: boolean;
};

export function buildSqlFilters(filters: SqlFilterInput[]): Prisma.Sql | null {
  const clauses: Prisma.Sql[] = [];

  filters.forEach(({ column, value, operator = 'LIKE', lowercase = true }) => {
    if (!value) return;

    const transformedValue =
      operator === 'LIKE' ? `%${value.toLowerCase()}%` : value.toLowerCase();

    const leftExpr = lowercase
      ? Prisma.sql`LOWER(${Prisma.raw(column)})`
      : Prisma.sql`${Prisma.raw(column)}`;

    clauses.push(
      Prisma.sql`${leftExpr} ${Prisma.raw(operator)} ${transformedValue}`,
    );
  });

  if (clauses.length === 0) return null;

  const joinedClauses = clauses.reduce((acc, clause, i) => {
    if (i === 0) return clause;
    return Prisma.sql`${acc} AND ${clause}`;
  });

  return joinedClauses;
}
