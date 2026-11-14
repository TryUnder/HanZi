import { ChevronRight, Menu, Search } from "lucide-react";
import { useLocation } from "react-router";
import styles from "./Topbar.module.css";

interface TopbarProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/statistics": "Statistics",
  "/writing": "Writing",
  "/speaking": "Speaking",
  "/flashcards": "Flashcards",
  "/library": "Library",
  "/settings": "Settings",
  "/help": "Help center",
};

export function Topbar({ onMenuClick }: TopbarProps) {
  const { pathname } = useLocation();
  const currentPage = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className={styles.topbar}>
      <button
        className={styles.mobileMenu}
        onClick={onMenuClick}
        aria-label="Open menu"
        type="button"
      >
        <Menu size={22} />
      </button>

      <div className={styles.breadcrumb}>
        <span>Workspace</span>
        <ChevronRight size={15} />
        <strong>{currentPage}</strong>
      </div>

      <div className={styles.topbarRight}>
        <div className={styles.searchBox}>
          <Search size={17} />
          <input placeholder="Search anything..." aria-label="Search" />
          <kbd>⌘ K</kbd>
        </div>

        <div className={styles.topbarLevel}>
          <span className={styles.levelDot} />
          Beginner
        </div>
      </div>
    </header>
  );
}
