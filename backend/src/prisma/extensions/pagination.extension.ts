import { Prisma } from "@prisma/client";
import type { PaginatedResponseDto } from "src/common/dto";

export interface PrismaPaginationArgs {
  page?: number;
  pageSize?: number;
}

/** Extrait le type d'un élément à partir du résultat de findMany */
type ItemOf<T, A> = Prisma.Result<T, A, "findMany">[number];

export const paginationExtension = Prisma.defineExtension({
  name: "pagination",
  model: {
    $allModels: {
      async paginate<T, A extends Prisma.Args<T, "findMany">>(
        this: T,
        args?: A & PrismaPaginationArgs,
      ): Promise<PaginatedResponseDto<ItemOf<T, A>>> {
        const {
          page = 0,
          pageSize,
          ...findManyArgs
        } = (args ?? {}) as A & PrismaPaginationArgs;
        const skip =
          pageSize && pageSize > 0 ? Math.max(0, page) * pageSize : undefined;
        const take = pageSize && pageSize > 0 ? pageSize : undefined;
        const context = Prisma.getExtensionContext(this) as unknown as {
          findMany: (payload: unknown) => Promise<unknown>;
          count: (payload: unknown) => Promise<number>;
        };

        const [results, total] = await Promise.all([
          context.findMany({ ...findManyArgs, skip, take }),
          context.count({
            where: (findManyArgs as { where?: unknown }).where,
            distinct: (findManyArgs as { distinct?: unknown }).distinct,
          }),
        ]);

        return { results, total } as PaginatedResponseDto<ItemOf<T, A>>;
      },
    },
  },
});
