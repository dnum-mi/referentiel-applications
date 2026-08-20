import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSavedFilterDto } from "./dto/create-saved-filter.dto";

@Injectable()
export class SavedFilterService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.savedFilter.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  // Sauvegarder sous un nom déjà utilisé remplace le filtre existant, à la manière
  // d'un « enregistrer sous » : pas de conflit à gérer côté front.
  async upsert(userId: string, data: CreateSavedFilterDto) {
    return this.prisma.savedFilter.upsert({
      where: { userId_name: { userId, name: data.name } },
      create: {
        userId,
        name: data.name,
        filters: data.filters as Prisma.InputJsonValue,
      },
      update: {
        filters: data.filters as Prisma.InputJsonValue,
      },
    });
  }

  async delete(userId: string, id: string) {
    const { count } = await this.prisma.savedFilter.deleteMany({
      where: { id, userId },
    });
    if (count === 0) {
      throw new NotFoundException(
        `Filtre sauvegardé avec l'id ${id} non trouvé`,
      );
    }
  }
}
