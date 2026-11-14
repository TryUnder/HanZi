import { StatisticsService } from "../../features/statistics/application/services/StatisticsService";

import { learningRecordService } from "./learningRecordService";

export const statisticsService = new StatisticsService(learningRecordService);
