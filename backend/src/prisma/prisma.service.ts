import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Prisma, PrismaClient } from "@prisma/client";
import databaseConfig from "src/config/configs/database.config";
import { LoggerService } from "src/logger/logger.service";
import { decimalToNumberExtension } from "./extensions/decimal-to-number.extension";
import { paginationExtension } from "./extensions/pagination.extension";

export type { PrismaPaginationArgs } from "./extensions/pagination.extension";

const withExtensions = (client: PrismaClient) =>
  client.$extends(decimalToNumberExtension).$extends(paginationExtension);

const ExtendedPrismaClient = PrismaClient as unknown as new (
  options: Prisma.PrismaClientOptions,
) => ReturnType<typeof withExtensions>;

@Injectable()
export class PrismaService
  extends ExtendedPrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(databaseConfig.KEY)
    private readonly config: ConfigType<typeof databaseConfig>,
    private readonly logger: LoggerService,
  ) {
    super({
      datasources: {
        db: {
          url: config.url,
        },
      },
    });
    Object.assign(this, withExtensions(this as unknown as PrismaClient));
  }

  async onModuleInit() {
    const safetoDisplayUrl = this.config.url.replace(/\/\/.*@/, "//****:****@");
    this.logger.debug(`Connecting to database at ${safetoDisplayUrl}`);
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
