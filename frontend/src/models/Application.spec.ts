import { FULL_READ_APP_PERMISSIONS, hasFullReadAppPermissions, type APP_PERMISSIONS } from "./Application";

describe("hasFullReadAppPermissions", () => {
  it("should return true when the user holds every read permission", () => {
    // Given
    const myPerms = new Set<APP_PERMISSIONS>(FULL_READ_APP_PERMISSIONS);

    // When / Then
    expect(hasFullReadAppPermissions(myPerms)).toBe(true);
  });

  it("should return false when a read permission is missing", () => {
    // Given
    const myPerms = new Set<APP_PERMISSIONS>(FULL_READ_APP_PERMISSIONS.slice(1));

    // When / Then
    expect(hasFullReadAppPermissions(myPerms)).toBe(false);
  });

  it("should return false when the user has no permissions at all", () => {
    // Given
    const myPerms = new Set<APP_PERMISSIONS>();

    // When / Then
    expect(hasFullReadAppPermissions(myPerms)).toBe(false);
  });

  it("should return false when myPerms is undefined", () => {
    // When / Then
    expect(hasFullReadAppPermissions(undefined)).toBe(false);
  });
});
