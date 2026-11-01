import { Plus, Volume2 } from "lucide-react";
import shared from "./DashboardShared.module.css";
import styles from "./DailyChallenge.module.css";

export function DailyChallenge() {
  return (
    <>
      <div className={`${shared.sectionHeading} ${styles.challengeHeader}`}>
        <div>
          <span className={shared.sectionKicker}>A LITTLE EVERY DAY</span>
          <h2>Daily challenge</h2>
        </div>
      </div>

      <article className={styles.challengeCard}>
        <div className={styles.challengeTop}>
          <span className={styles.challengeLabel}>CHARACTER OF THE DAY</span>
          <span className={styles.challengeBadge}>HSK 1</span>
        </div>

        <div className={styles.characterDisplay}>好</div>
        <h3>hǎo</h3>
        <p className={styles.characterMeaning}>good · well</p>

        <div className={styles.characterDivider} />

        <div className={styles.characterDetails}>
          <div>
            <span>PINYIN</span>
            <strong>hǎo</strong>
          </div>
          <div>
            <span>STROKES</span>
            <strong>6</strong>
          </div>
          <div>
            <span>RADICAL</span>
            <strong>女</strong>
          </div>
        </div>

        <button className={styles.audioButton} type="button">
          <Volume2 size={17} />
          Listen to pronunciation
        </button>
      </article>

      <article className={styles.quoteCard}>
        <div className={styles.quoteIcon}>“</div>
        <p>千里之行，始于足下。</p>
        <span>A journey of a thousand miles begins with a single step.</span>
        <div className={styles.quoteAuthor}>— Chinese proverb</div>
      </article>

      <button className={styles.addGoalButton} type="button">
        <Plus size={17} />
        Customize your daily goal
      </button>
    </>
  );
}
