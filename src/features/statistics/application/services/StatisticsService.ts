import type { LearningRecordService } from "../../../learning/application/services/LearningRecordService";

import { aggregateLearningRecords } from "../../domain/aggregations/aggregateLearningRecords";
import type { LearningStatistics } from "../../domain/types/statistics";

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

  async getStatistics(): Promise<LearningStatistics> {
    const records = await this.learningRecordService.getAllRecords();

    return aggregateLearningRecords(records);
  }
}
