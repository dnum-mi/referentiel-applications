import { Permission } from "@prisma/client";
import { REQUIRED_PERMISSIONS } from "src/common/decorators/required-permissions.decorator";
import { GristController } from "./grist.controller";

describe("GristController", () => {
  it.each(["setup", "records"] as const)(
    "exige la capacité GristSync sur %s",
    (method) => {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS,
          GristController.prototype[method],
        ),
      ).toEqual([Permission.GristSync]);
    },
  );
});
