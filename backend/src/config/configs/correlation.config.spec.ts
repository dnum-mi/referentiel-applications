import { correlationConfig } from "./correlation.config";

/**
 * Le seuil et les poids viennent de l'environnement : une valeur mal saisie
 * ne doit pas dérégler silencieusement la détection (#2281).
 */
describe("correlationConfig", () => {
  const KEYS = [
    "CORRELATION_CRON_ENABLED",
    "CORRELATION_SCORE_THRESHOLD",
    "CORRELATION_WEIGHT_NAME",
    "CORRELATION_WEIGHT_DATA",
    "CORRELATION_WEIGHT_ACTORS",
  ];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("applique les valeurs par défaut sans configuration", () => {
    const config = correlationConfig();

    expect(config.cronEnabled).toBe(false);
    expect(config.scoreThreshold).toBe(0.6);
    expect(config.weights).toEqual({
      nameSimilarity: 0.6,
      sharedData: 0.25,
      sharedActors: 0.15,
    });
  });

  it("lit un ratio valide", () => {
    process.env.CORRELATION_SCORE_THRESHOLD = "0.75";

    expect(correlationConfig().scoreThreshold).toBe(0.75);
  });

  it("ignore une virgule décimale, qui vaudrait un seuil nul", () => {
    // parseFloat("0,8") === 0 : toutes les paires deviendraient des suggestions.
    process.env.CORRELATION_SCORE_THRESHOLD = "0,8";

    expect(correlationConfig().scoreThreshold).toBe(0.6);
  });

  it("ignore les valeurs hors de l'intervalle [0, 1]", () => {
    process.env.CORRELATION_WEIGHT_NAME = "1.4";
    process.env.CORRELATION_WEIGHT_DATA = "-0.2";

    const { weights } = correlationConfig();
    expect(weights.nameSimilarity).toBe(0.6);
    expect(weights.sharedData).toBe(0.25);
  });

  it("ignore une valeur non numérique", () => {
    process.env.CORRELATION_WEIGHT_ACTORS = "beaucoup";

    expect(correlationConfig().weights.sharedActors).toBe(0.15);
  });

  it("accepte les bornes 0 et 1", () => {
    process.env.CORRELATION_SCORE_THRESHOLD = "0";
    process.env.CORRELATION_WEIGHT_NAME = "1";

    const config = correlationConfig();
    expect(config.scoreThreshold).toBe(0);
    expect(config.weights.nameSimilarity).toBe(1);
  });
});
