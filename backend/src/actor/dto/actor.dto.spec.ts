import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { BulkUpdateActorByEmailDto, UpdateActorDto } from "./actor.dto";

describe.each([
  { name: "UpdateActorDto", Dto: UpdateActorDto, required: {} },
  {
    name: "BulkUpdateActorByEmailDto",
    Dto: BulkUpdateActorByEmailDto,
    required: { targetEmail: "actor@example.test" },
  },
])(
  "$name — type d'acteur obligatoire s'il est fourni (#2934)",
  ({ Dto, required }) => {
    const errorsFor = (body: object) =>
      validate(plainToInstance(Dto, { ...required, ...body }));

    it.each([
      { label: "null", value: null },
      { label: "nombre", value: 42 },
      { label: "booléen", value: false },
      { label: "objet", value: {} },
      { label: "tableau", value: [] },
    ])(
      "refuse actorTypeId de type $label avant toute écriture",
      async ({ value: actorTypeId }) => {
        const errors = await errorsFor({ actorTypeId });
        expect(errors.map((error) => error.property)).toEqual(["actorTypeId"]);
        expect(errors[0].constraints).toHaveProperty("isString");
      },
    );

    it("accepte une modification partielle sans type d'acteur", async () => {
      expect(await errorsFor({ firstname: "Alice" })).toHaveLength(0);
      expect(await errorsFor({ actorTypeId: undefined })).toHaveLength(0);
    });

    it("accepte le remplacement par un identifiant de type valide", async () => {
      expect(
        await errorsFor({
          actorTypeId: "5708d232-8338-4abf-8f38-8370acc89497",
          isGroup: false,
        }),
      ).toHaveLength(0);
    });

    it("refuse aussi isGroup:null car ce booléen n'est pas nullable", async () => {
      const errors = await errorsFor({ isGroup: null });
      expect(errors.map((error) => error.property)).toEqual(["isGroup"]);
      expect(errors[0].constraints).toHaveProperty("isBoolean");
    });

    it.each([
      "organizationId",
      "applicationId",
      "email",
      "firstname",
      "lastname",
    ])("préserve l'effacement du champ optionnel %s", async (field) => {
      expect(await errorsFor({ [field]: null })).toHaveLength(0);
    });
  },
);
