import { BookOpen, ChevronRight, Layers, Play } from "lucide-react";
import { Link } from "react-router";
import shared from "./DashboardShared.module.css";
import styles from "./ContinueLearning.module.css";

export function ContinueLearning() {
  return (
    <>
      <div className={shared.sectionHeading}>
        <div>
          <span className={shared.sectionKicker}>
            PICK UP WHERE YOU LEFT OFF
          </span>
          <h2>Continue learning</h2>
        </div>

        <Link className={shared.textButton} to="/library">
          View all <ChevronRight size={16} />
        </Link>
      </div>

      <article className={styles.continueCard}>
        <div className={styles.continueArt}>
          <span className={styles.artSmall}>你好</span>
          <span className={styles.artCharacter}>学</span>
          <span className={styles.artCaption}>LEARN SOMETHING NEW</span>
        </div>

        <div className={styles.continueInfo}>
          <div className={styles.lessonTag}>YOUR FIRST LESSON</div>
          <h3>Getting started with Chinese</h3>
          <p>
            Learn the basics of Mandarin, discover Pinyin and meet your first
            Chinese characters.
          </p>

          <div className={styles.lessonMeta}>
            <span>
              <BookOpen size={15} /> 5 min
            </span>
            <span>
              <Layers size={15} /> Beginner
            </span>
          </div>

          <Link className={styles.primaryButton} to="/library">
            Start learning <Play size={15} fill="currentColor" />
          </Link>
        </div>
      </article>
    </>
  );
}
