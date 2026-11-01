import { Sparkles } from "lucide-react";

export function WelcomeSection() {
  return (
    <section className="welcome-section">
      <div>
        <div className="eyebrow">
          <Sparkles size={15} />
          YOUR LEARNING JOURNEY
        </div>

        <h1>
          你好, welcome back<span>.</span>
        </h1>

        <p className="welcome-description">
          Every character brings you closer to fluency. Let's make today count.
        </p>
      </div>

      <div className="welcome-date">
        <span className="date-label">YOUR DAILY JOURNEY</span>
        <strong>Day 01</strong>
        <span className="date-subtitle">A new beginning</span>
      </div>
    </section>
  );
}
