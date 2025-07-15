import { StatsCronService } from "./stats.cron";
import { StatsService } from "./stats.service";

describe('StatsCronService', () => {
  it('doit appeler computeAndStoreMonthlyIqAvg une fois quand handleMonthlyJob est appelé', async () => {
    const computeMock = jest.fn().mockResolvedValue('ok');

    const mockStatsService = {
      computeAndStoreMonthlyIqAvg: computeMock,
    } as unknown as StatsService;

    const cronService = new StatsCronService(mockStatsService);

    await cronService.handleMonthlyJob();

    expect(computeMock).toHaveBeenCalledTimes(1);
  });
});