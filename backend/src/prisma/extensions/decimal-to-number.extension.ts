import { Prisma } from "@prisma/client";

function convertDecimals(value: unknown): unknown {
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(convertDecimals);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, convertDecimals(v)]),
    );
  }
  return value;
}

export const decimalToNumberExtension = Prisma.defineExtension({
  name: "decimalToNumber",
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        const result = await query(args);
        return convertDecimals(result);
      },
    },
  },
});
