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

function convertDecimals(value: unknown): unknown {
  if (Prisma.Decimal.isDecimal(value)) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map(convertDecimals);
  }

  if (value && typeof value === "object") {
    if (value instanceof Date) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, convertDecimals(val)]),
    );
  }

  return value;
}

const decimalToNumberExtension = Prisma.defineExtension({
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

@Injectable()
export class PrismaService
  extends PrismaClient
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

    Object.assign(this, this.$extends(decimalToNumberExtension));
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
