import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

  async rename(userId: string, id: string, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 100) {
      throw new BadRequestException(
        "Le nom du filtre doit contenir entre 1 et 100 caractères.",
      );
    }
    try {
      // Une seule écriture, bornée au propriétaire. L'index userId/name protège
      // les conflits concurrents sans toucher aux critères ni au filtre homonyme.
      return await this.prisma.savedFilter.update({
        where: { id, userId },
        data: { name: trimmedName },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new ConflictException(
            "Un autre filtre personnel porte déjà ce nom.",
          );
        }
        if (error.code === "P2025") {
          throw new NotFoundException(
            `Filtre sauvegardé avec l'id ${id} non trouvé`,
          );
        }
      }
      throw error;
    }
  }
}
