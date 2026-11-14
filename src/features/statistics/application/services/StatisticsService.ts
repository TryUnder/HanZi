
import type { LearningRecordService } from "../../../learning/application/services/LearningRecordService";

import { aggregateLearningRecords } from "../../domain/aggregations/aggregateLearningRecords";
import type { StatisticsDashboardData } from "../types/statisticsDashboardData";
import { resolveStatisticsItemDisplay } from "../resolvers/resolveStatisticsItemDisplay";

export class StatisticsService {
  private readonly learningRecordService: Pick<
    LearningRecordService,
    "getAllRecords"
  >;

  constructor(
    learningRecordService: Pick<LearningRecordService, "getAllRecords">,
  ) {
    this.learningRecordService = learningRecordService;
  }

  async getStatistics(): Promise<StatisticsDashboardData> {
    const records = await this.learningRecordService.getAllRecords();
    const statistics = aggregateLearningRecords(records);

    return {
      ...statistics,
      items: statistics.items.map((item) => ({
        ...item,
        display: resolveStatisticsItemDisplay(item.item),
      })),
    };
  }
}
