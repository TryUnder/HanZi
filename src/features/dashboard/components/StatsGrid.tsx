import { BookOpen, Flame, Layers, Target } from "lucide-react";
import styles from "./StatsGrid.module.css";

export function StatsGrid() {
  return (
    <section className={styles.statsGrid} aria-label="Learning statistics">
      <article className={styles.statCard}>
        <div className={styles.statTop}>
          <div className={`${styles.statIcon} ${styles.purple}`}>
            <Flame size={19} />
          </div>
          <span className={styles.statCaption}>DAILY STREAK</span>
        </div>
        <div className={styles.statValue}>
          0 <span>days</span>
        </div>
        <p>Start your learning streak today</p>
      </article>

      <article className={styles.statCard}>
        <div className={styles.statTop}>
          <div className={`${styles.statIcon} ${styles.orange}`}>
            <Target size={19} />
          </div>
          <span className={styles.statCaption}>DAILY GOAL</span>
        </div>
        <div className={styles.statValue}>
          0 <span>/ 20 min</span>
        </div>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: "0%" }} />
        </div>
        <p>20 minutes of focused learning</p>
      </article>

      <article className={styles.statCard}>
        <div className={styles.statTop}>
          <div className={`${styles.statIcon} ${styles.green}`}>
            <BookOpen size={19} />
          </div>
          <span className={styles.statCaption}>CHARACTERS LEARNED</span>
        </div>
        <div className={styles.statValue}>
          0 <span>characters</span>
        </div>
        <p>Your vocabulary starts here</p>
      </article>

      <article className={styles.statCard}>
        <div className={styles.statTop}>
          <div className={`${styles.statIcon} ${styles.blue}`}>
            <Layers size={19} />
          </div>
          <span className={styles.statCaption}>REVIEW QUEUE</span>
        </div>
        <div className={styles.statValue}>
          12 <span>cards</span>
        </div>
        <p>Ready when you are</p>
      </article>
    </section>
  );
}
