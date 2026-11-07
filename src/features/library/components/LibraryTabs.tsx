import { NavLink } from "react-router";
import { BookOpen, Languages } from "lucide-react";
import styles from "./LibraryTabs.module.css";

export function LibraryTabs() {
  return (
    <nav className={styles.tabs} aria-label="Library sections">
      <NavLink
        to="/library/characters"
        className={({ isActive }) =>
          `${styles.tab} ${isActive ? styles.active : ""}`
        }
      >
        <Languages size={17} />
        <span>Characters</span>
      </NavLink>

      <NavLink
        to="/library/vocabulary"
        className={({ isActive }) =>
          `${styles.tab} ${isActive ? styles.active : ""}`
        }
      >
        <BookOpen size={17} />
        <span>Vocabulary</span>
      </NavLink>
    </nav>
  );
}