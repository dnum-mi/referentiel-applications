import { BadRequestException } from "@nestjs/common";
import { assertPublicHttpUrl, isPrivateAddress } from "./ecoindex.utils";

describe("EcoIndex — garde SSRF (#2373)", () => {
  describe("isPrivateAddress", () => {
    it.each([
      "127.0.0.1",
      "10.1.2.3",
      "172.16.5.4",
      "172.31.255.255",
      "192.168.0.1",
      "169.254.169.254", // métadonnées cloud
      "100.64.0.1", // CGNAT
      "0.0.0.0",
      "::1",
      "fc00::1",
      "fd12::34",
      "fe80::1",
      "::ffff:127.0.0.1", // IPv4-mapped loopback
    ])("classe %s comme interne", (ip) => {
      expect(isPrivateAddress(ip)).toBe(true);
    });

    it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "2001:4860:4860::8888"])(
      "classe %s comme publique",
      (ip) => {
        expect(isPrivateAddress(ip)).toBe(false);
      },
    );

    // 172.15/172.32 sont hors de la plage privée 172.16/12 — ne pas les bloquer par excès.
    it("ne déborde pas la frontière 172.16/12", () => {
      expect(isPrivateAddress("172.15.0.1")).toBe(false);
      expect(isPrivateAddress("172.32.0.1")).toBe(false);
    });
  });

  describe("assertPublicHttpUrl", () => {
    it("rejette un schéma non http(s)", async () => {
      await expect(assertPublicHttpUrl("file:///etc/passwd")).rejects.toThrow(
        BadRequestException,
      );
      await expect(assertPublicHttpUrl("gopher://x/_")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejette une URL invalide", async () => {
      await expect(assertPublicHttpUrl("pas une url")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejette une IP interne littérale", async () => {
      await expect(
        assertPublicHttpUrl("http://169.254.169.254/latest/meta-data/"),
      ).rejects.toThrow(BadRequestException);
      await expect(
        assertPublicHttpUrl("http://127.0.0.1:8080/"),
      ).rejects.toThrow(BadRequestException);
      await expect(assertPublicHttpUrl("http://[::1]/")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("accepte une IP publique littérale", async () => {
      await expect(
        assertPublicHttpUrl("https://8.8.8.8/"),
      ).resolves.toBeUndefined();
    });
  });
});
