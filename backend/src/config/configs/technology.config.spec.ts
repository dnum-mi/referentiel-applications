import { technologyConfig } from "./technology.config";

describe("technologyConfig", () => {
  const initial = { ...process.env };

  afterEach(() => {
    process.env = { ...initial };
  });

  // Le cron sort du réseau : une activation implicite enverrait du trafic vers
  // endoflife.date depuis n'importe quel environnement de développement.
  it("laisse le cron désactivé tant qu'il n'est pas explicitement activé", () => {
    delete process.env.TECHNOLOGY_EOL_CRON_ENABLED;
    expect(technologyConfig().eolCronEnabled).toBe(false);
    process.env.TECHNOLOGY_EOL_CRON_ENABLED = "1";
    expect(technologyConfig().eolCronEnabled).toBe(false);
    process.env.TECHNOLOGY_EOL_CRON_ENABLED = "true";
    expect(technologyConfig().eolCronEnabled).toBe(true);
  });

  it("retient une taille de lot valide", () => {
    process.env.TECHNOLOGY_EOL_BATCH_SIZE = "20";
    expect(technologyConfig().eolBatchSize).toBe(20);
  });

  it.each(["0", "201", "abc", "12.5", "-1"])(
    "retombe sur le défaut pour une taille de lot invalide (%s)",
    (value) => {
      process.env.TECHNOLOGY_EOL_BATCH_SIZE = value;
      expect(technologyConfig().eolBatchSize).toBe(50);
    },
  );

  it("retombe sur le défaut quand la variable est absente ou vide", () => {
    delete process.env.TECHNOLOGY_EOL_BATCH_SIZE;
    expect(technologyConfig().eolBatchSize).toBe(50);
    process.env.TECHNOLOGY_EOL_BATCH_SIZE = "";
    expect(technologyConfig().eolBatchSize).toBe(50);
  });
});
