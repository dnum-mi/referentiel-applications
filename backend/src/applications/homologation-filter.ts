import { BadRequestException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { ApplicationSearchDto } from "./dto/search-application.dto";

const parisDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const parisHour = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  hourCycle: "h23",
});

function midnight(day: string, next = false): Date {
  const utc = new Date(`${day}T00:00:00.000Z`);
  if (next) utc.setUTCDate(utc.getUTCDate() + 1);
  // À minuit UTC, l’heure parisienne donne le décalage du début de cette journée.
  return new Date(utc.getTime() - Number(parisHour.format(utc)) * 3_600_000);
}

export function homologationWhere(
  filters: ApplicationSearchDto,
  now = new Date(),
): Prisma.ApplicationWhereInput {
  const {
    homologationDateMode: mode,
    homologationDateFrom: from,
    homologationDateTo: to,
  } = filters;
  if (from && to && from > to)
    throw new BadRequestException(
      "La date de début doit précéder la date de fin.",
    );
  if (mode === "range" && !from && !to)
    throw new BadRequestException("Indiquez au moins une borne de dates.");
  if (mode === "expired") {
    return {
      compliance: {
        homologation_status: "homologuee",
        homologation_date_end: { lt: midnight(parisDay.format(now)) },
      },
    };
  }
  const clauses: Prisma.ApplicationWhereInput[] = [];
  if (filters.homologationStatus)
    clauses.push({
      compliance: { homologation_status: filters.homologationStatus },
    });
  if (mode === "missing")
    clauses.push({
      NOT: { compliance: { homologation_date_end: { not: null } } },
    });
  if (mode === "range")
    clauses.push({
      compliance: {
        homologation_date_end: {
          ...(from ? { gte: midnight(from) } : {}),
          ...(to ? { lt: midnight(to, true) } : {}),
        },
      },
    });
  return { AND: clauses };
}
