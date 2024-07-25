import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      // log: process.env.NODE_ENV === 'test' ? ['query'] : [],
      // log: ['query'],
      datasources: {
        db: {
          url:
            process.env.NODE_ENV === 'test'
              ? process.env.TEST_DATABASE_URL
              : process.env.DATABASE_URL,
        },
      },
    });
  }

  async onModuleInit() {
    // await this.$connect();
  }
}
