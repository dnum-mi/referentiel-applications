import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { PrismaService } from "./prisma.service";
import { ConfigModule } from "@nestjs/config";
import databaseConfig from "src/config/configs/database.config";
import { LoggerModule } from "src/logger/logger.module";

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
