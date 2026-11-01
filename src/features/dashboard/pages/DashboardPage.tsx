import { ContinueLearning } from "../components/ContinueLearning";
import { DailyChallenge } from "../components/DailyChallenge";
import { LearningPath } from "../components/LearningPath";
import { StatsGrid } from "../components/StatsGrid";
import { WelcomeSection } from "../components/WelcomeSection";

export function DashboardPage() {
  return (
    <div className="dashboard">
      <WelcomeSection />
      <StatsGrid />

      <section className="content-grid">
        <div className="main-column">
          <ContinueLearning />
          <LearningPath />
        </div>

        <div className="right-column">
          <DailyChallenge />
        </div>
      </section>

      <footer className="footer">
        <span>HanZi Chinese Learning Studio</span>
        <span>慢慢来 · Take it one step at a time</span>
      </footer>
    </div>
  );
}
