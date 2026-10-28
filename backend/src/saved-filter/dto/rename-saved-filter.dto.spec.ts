import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RenameSavedFilterDto } from "./rename-saved-filter.dto";

describe("RenameSavedFilterDto", () => {
  it("normalizes the name without accepting criteria or an owner", async () => {
    const dto = plainToInstance(RenameSavedFilterDto, {
      name: " Nouveau nom ",
      filters: {},
      userId: "other",
    });
    expect(dto.name).toBe("Nouveau nom");
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property).sort()).toEqual([
      "filters",
      "userId",
    ]);
  });
  it.each([{}, { name: "   " }, { name: 42 }, { name: "x".repeat(101) }])(
    "rejects invalid input %j",
    async (body) => {
      expect(
        await validate(plainToInstance(RenameSavedFilterDto, body)),
      ).not.toHaveLength(0);
    },
  );
});
