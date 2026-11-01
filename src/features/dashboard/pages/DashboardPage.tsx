import { ContinueLearning } from "../components/ContinueLearning";
import { DailyChallenge } from "../components/DailyChallenge";
import { LearningPath } from "../components/LearningPath";
import { StatsGrid } from "../components/StatsGrid";
import { WelcomeSection } from "../components/WelcomeSection";
import styles from "./DashboardPage.module.css";

export function DashboardPage() {
  return (
    <div className={styles.dashboard}>
      <WelcomeSection />
      <StatsGrid />

      <section className={styles.contentGrid}>
        <div className={styles.mainColumn}>
          <ContinueLearning />
          <LearningPath />
        </div>

        <div className={styles.rightColumn}>
          <DailyChallenge />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>HanZi Chinese Learning Studio</span>
        <span>慢慢来 · Take it one step at a time</span>
      </footer>
    </div>
  );
}
