import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import databaseConfig from "src/config/configs/database.config";
import { LoggerService } from "src/logger/logger.service";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
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
