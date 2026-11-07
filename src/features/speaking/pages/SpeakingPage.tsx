import { ToneTrainer } from "../components/ToneTrainer";
import styles from "./SpeakingPage.module.css";

export default function SpeakingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PRONUNCIATION & TONES</span>
          <h1>Speaking</h1>
          <p>Learn Mandarin pronunciation and master the five tones.</p>
        </div>
      </header>

      <ToneTrainer />
    </div>
  );
}
