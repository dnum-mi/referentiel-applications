/**
 * Common pagination utility for database queries
 */
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  skip: number | undefined;
  take: number | undefined;
}

/**
 * Calculate pagination parameters for database queries
 * @param page - Zero-based page number
 * @param pageSize - Number of items per page (0 or negative disables pagination)
 * @returns Object with skip and take values for Prisma queries
 */
export function paginate(
  page: number = 0,
  pageSize?: number,
): PaginationResult {
  if (!pageSize || pageSize <= 0) {
    return { skip: undefined, take: undefined };
  }

  const safePage = Math.max(0, page);

  return {
    skip: safePage * pageSize,
    take: pageSize,
  };
}
