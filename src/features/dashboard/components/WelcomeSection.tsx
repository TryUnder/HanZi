import { Sparkles } from "lucide-react";
import styles from "./WelcomeSection.module.css";

export function WelcomeSection() {
  return (
    <section className={styles.welcomeSection}>
      <div>
        <div className={styles.eyebrow}>
          <Sparkles size={15} />
          YOUR LEARNING JOURNEY
        </div>

        <h1>
          你好, welcome back<span>.</span>
        </h1>

        <p className={styles.welcomeDescription}>
          Every character brings you closer to fluency. Let's make today count.
        </p>
      </div>

      <div className={styles.welcomeDate}>
        <span className={styles.dateLabel}>YOUR DAILY JOURNEY</span>
        <strong>Day 01</strong>
        <span className={styles.dateSubtitle}>A new beginning</span>
      </div>
    </section>
  );
}
