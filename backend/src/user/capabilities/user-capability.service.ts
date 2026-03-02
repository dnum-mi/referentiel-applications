import { Injectable } from "@nestjs/common";
import { CapabilityNames } from "@prisma/client";
import {
  AdminLevel,
  UserCapabilities,
  UserEntity,
} from "src/user/entities/user.entity";

@Injectable()
export class UserCapabilityService {
  public mergeCapabilities(
    userAdminLevel: UserEntity["adminLevel"],
    userCapabilities: CapabilityNames[] = [],
  ) {
    const capabilities: CapabilityNames[] = userCapabilities;
    if (userAdminLevel >= AdminLevel.WRITE) {
      capabilities.push(
        UserCapabilities.CreateApplication,
        UserCapabilities.CreateGlobalReport,
      );
    }
    if (userAdminLevel >= AdminLevel.ADMIN) {
      capabilities.push(UserCapabilities.ExportData); // Only for ADMIN
    }
    return capabilities;
  }
}
