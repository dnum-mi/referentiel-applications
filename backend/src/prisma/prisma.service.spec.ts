import type { TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import databaseConfig from "src/config/configs/database.config";
import { LoggerModule } from "src/logger/logger.module";
import { PrismaService } from "./prisma.service";

describe("prismaService", () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [databaseConfig],
        }),
        LoggerModule,
      ],
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
