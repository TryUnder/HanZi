import { ToneTrainer } from "../components/ToneTrainer";
import styles from "./SpeakingPage.module.css";

export default function SpeakingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Speaking</h1>
          <p className={styles.description}>
            Learn Mandarin pronunciation and master the five tones.
          </p>
        </div>
      </header>

      <ToneTrainer />
    </div>
  );
}
