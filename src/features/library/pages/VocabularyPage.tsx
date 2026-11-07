import { BookOpen } from "lucide-react";
import { LibraryTabs } from "../components/LibraryTabs";
import styles from "./VocabularyPage.module.css";

export function VocabularyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>YOUR CHINESE KNOWLEDGE BASE</span>
          <h1>Vocabulary</h1>
          <p>
            Explore Chinese words, their pronunciation, meanings and examples.
          </p>
        </div>
      </header>

      <LibraryTabs />

      <section className={styles.emptyState}>
        <BookOpen size={32} />

        <h2>Vocabulary library</h2>

        <p>
          Your vocabulary database is ready to be connected. We will add
          searching, HSK filters and learning information here.
        </p>
      </section>
    </div>
  );
}