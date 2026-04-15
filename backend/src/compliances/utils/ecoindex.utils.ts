import {
  computeEcoIndex,
  computeGreenhouseGasesEmissionfromEcoIndex,
  computeWaterConsumptionfromEcoIndex,
} from "ecoindex";

const REQUEST_COUNT = 1;

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function countDomElements(html: string): number {
  return Math.max(1, (html.match(/<[a-zA-Z][^/!>]*>/g) ?? []).length);
}

function computePageSizeInKb(html: string): number {
  return Math.max(0.01, Buffer.byteLength(html, "utf8") / 1024);
}

function calculateEcoIndexMetricsFromHtml(html: string): {
  score: number;
  ges: number;
  water: number;
} {
  const domElements = countDomElements(html);
  const pageSizeInKb = computePageSizeInKb(html);

  const score = roundTo2(
    computeEcoIndex(domElements, REQUEST_COUNT, pageSizeInKb),
  );
  const ges = roundTo2(computeGreenhouseGasesEmissionfromEcoIndex(score));
  const water = roundTo2(computeWaterConsumptionfromEcoIndex(score));

  return { score, ges, water };
}

export async function calculateEcoIndexMetricsFromUrl(
  targetUrl: string,
): Promise<{
  score: number;
  ges: number;
  water: number;
  calculatedAt: Date;
}> {
  const response = await fetch(targetUrl);

  if (!response.ok) {
    throw new Error(`EcoIndex target responded with status ${response.status}`);
  }

  const html = await response.text();
  const { score, ges, water } = calculateEcoIndexMetricsFromHtml(html);

  return {
    score,
    ges,
    water,
    calculatedAt: new Date(),
  };
}
