import { Inject, Injectable } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { appConfig } from "src/config/configs";
import { PrismaService } from "src/prisma/prisma.service";

interface RecoveryState {
  inRecovery: boolean;
}

@Injectable()
export class MaintenanceService {
  private cachedState?: { active: boolean; expiresAt: number };
  private pendingCheck?: Promise<boolean>;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  isForced(): boolean {
    return this.config.maintenanceMode;
  }

  async isActive(): Promise<boolean> {
    if (this.isForced()) {
      return true;
    }

    const now = Date.now();
    if (this.cachedState && this.cachedState.expiresAt > now) {
      return this.cachedState.active;
    }

    if (!this.pendingCheck) {
      this.pendingCheck = this.readRecoveryState()
        .then((active) => {
          this.cachedState = {
            active,
            expiresAt: Date.now() + this.config.maintenanceCacheTtlMs,
          };
          return active;
        })
        .finally(() => {
          this.pendingCheck = undefined;
        });
    }

    return this.pendingCheck;
  }

  private async readRecoveryState(): Promise<boolean> {
    const [state] = await this.prisma.$queryRaw<RecoveryState[]>(
      Prisma.sql`SELECT pg_is_in_recovery() AS "inRecovery"`,
    );
    return state?.inRecovery === true;
  }
}
