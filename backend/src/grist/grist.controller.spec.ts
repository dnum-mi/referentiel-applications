import { FeatureId } from "src/features/beta-features";
import { REQUIRED_BETA_FEATURE } from "src/common/decorators/requires-beta-feature.decorator";
import type { ApplicationSearchDto } from "src/applications/dto/search-application.dto";
import type { Requestor } from "src/user/entities/user.entity";
import { GristController } from "./grist.controller";
import type { GristService } from "./grist.service";

describe("GristController", () => {
  it.each(["setup", "tables", "records"] as const)(
    "exige la bêta feature GristSync sur %s",
    (method) => {
      expect(
        Reflect.getMetadata(
          REQUIRED_BETA_FEATURE,
          GristController.prototype[method],
        ),
      ).toEqual(FeatureId.GristSync);
    },
  );

  it("transmet les filtres de recherche et le demandeur à la synchronisation", async () => {
    const setup = jest.fn().mockResolvedValue({ documents: [] });
    const controller = new GristController({
      setup,
    } as unknown as GristService);
    const filters = { shortName: "app" } as ApplicationSearchDto;
    const requestor = { id: "u1" } as Requestor;

    const targets = [{ docId: "doc1", tableId: "RefApp2" }];

    const columns = ["label", "status"];
    await controller.setup(filters, { targets, columns }, requestor);

    expect(setup).toHaveBeenCalledWith(filters, requestor, targets, columns);
  });

  it("lit le document demandé pour le compte du demandeur", async () => {
    const records = jest.fn().mockResolvedValue([]);
    const controller = new GristController({
      records,
    } as unknown as GristService);
    const requestor = { id: "u1" } as Requestor;

    await controller.records("doc1", requestor, "RefApp2");

    expect(records).toHaveBeenCalledWith("doc1", requestor, "RefApp2");
  });
});
