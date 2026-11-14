
import type {
  ItemStatistics,
  LearningStatistics,
} from "../../domain/types/statistics";

import type { StatisticsItemDisplay } from "../resolvers/resolveStatisticsItemDisplay";

export interface StatisticsDashboardItem extends ItemStatistics {
  readonly display: StatisticsItemDisplay;
}

export interface StatisticsDashboardData
  extends Omit<LearningStatistics, "items"> {
  readonly items: readonly StatisticsDashboardItem[];
}
