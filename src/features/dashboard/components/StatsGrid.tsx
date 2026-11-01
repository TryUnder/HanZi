import { BookOpen, Flame, Layers, Target } from "lucide-react";

export function StatsGrid() {
  return (
    <section className="stats-grid" aria-label="Learning statistics">
      <article className="stat-card">
        <div className="stat-top">
          <div className="stat-icon purple">
            <Flame size={19} />
          </div>
          <span className="stat-caption">DAILY STREAK</span>
        </div>
        <div className="stat-value">
          0 <span>days</span>
        </div>
        <p>Start your learning streak today</p>
      </article>

      <article className="stat-card">
        <div className="stat-top">
          <div className="stat-icon orange">
            <Target size={19} />
          </div>
          <span className="stat-caption">DAILY GOAL</span>
        </div>
        <div className="stat-value">
          0 <span>/ 20 min</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: "0%" }} />
        </div>
        <p>20 minutes of focused learning</p>
      </article>

      <article className="stat-card">
        <div className="stat-top">
          <div className="stat-icon green">
            <BookOpen size={19} />
          </div>
          <span className="stat-caption">CHARACTERS LEARNED</span>
        </div>
        <div className="stat-value">
          0 <span>characters</span>
        </div>
        <p>Your vocabulary starts here</p>
      </article>

      <article className="stat-card">
        <div className="stat-top">
          <div className="stat-icon blue">
            <Layers size={19} />
          </div>
          <span className="stat-caption">REVIEW QUEUE</span>
        </div>
        <div className="stat-value">
          12 <span>cards</span>
        </div>
        <p>Ready when you are</p>
      </article>
    </section>
  );
}
