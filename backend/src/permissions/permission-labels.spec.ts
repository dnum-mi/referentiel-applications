import { Permission, Roles } from "@prisma/client";
import { PERMISSIONS_LABELS, RolesWording } from "./permission-labels";

describe("Libellés des droits", () => {
  it.each(Object.values(Permission))(
    "traduit la permission %s",
    (permission) => {
      expect(PERMISSIONS_LABELS[permission]).toEqual(expect.any(String));
      expect(PERMISSIONS_LABELS[permission]).not.toBe(permission);
      expect(PERMISSIONS_LABELS[permission].trim()).not.toBe("");
    },
  );
  it.each(Object.values(Roles))("traduit le rôle %s", (role) => {
    expect(RolesWording[role]).toEqual(expect.any(String));
    expect(RolesWording[role]).not.toBe(role);
  });
});
