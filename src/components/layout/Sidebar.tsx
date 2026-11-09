import {
  GraduationCap,
  Headphones,
  HelpCircle,
  LayoutDashboard,
  Layers,
  Library,
  PenLine,
  Settings,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
}

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", path: "/courses", icon: GraduationCap },
  { label: "Writing", path: "/writing", icon: PenLine },
  { label: "Speaking", path: "/speaking", icon: Headphones },
  { label: "Flashcards", path: "/flashcards", icon: Layers },
  { label: "Library", path: "/library", icon: Library },
];

export function Sidebar({ isOpen, onNavigate }: SidebarProps) {
  const sidebarClassName = [styles.sidebar, isOpen ? styles.sidebarOpen : ""]
    .filter(Boolean)
    .join(" ");

  const getNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
    [styles.navItem, isActive ? styles.active : ""].filter(Boolean).join(" ");

  return (
    <aside className={sidebarClassName}>
      <div className={styles.brand}>
        <div className={styles.brandSymbol}>汉</div>
        <div>
          <div className={styles.brandName}>HanZi</div>
          <div className={styles.brandSubtitle}>CHINESE STUDIO</div>
        </div>
      </div>

      <div className={styles.sidebarLabel}>MENU</div>

      <nav className={styles.navigation} aria-label="Main navigation">
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onNavigate}
            className={getNavLinkClassName}
          >
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
            {label === "Flashcards" && (
              <span className={styles.navCount}>12</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.sidebarLabel}>PREFERENCES</div>

        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={getNavLinkClassName}
        >
          <Settings size={19} strokeWidth={1.8} />
          <span>Settings</span>
        </NavLink>

        <NavLink
          to="/help"
          onClick={onNavigate}
          className={getNavLinkClassName}
        >
          <HelpCircle size={19} strokeWidth={1.8} />
          <span>Help center</span>
        </NavLink>

        <div className={styles.sidebarCard}>
          <div className={styles.sidebarCardIcon}>
            <Sparkles size={18} />
          </div>
          <strong>Keep learning!</strong>
          <p>Small steps every day lead to big progress.</p>
          <div className={styles.sidebarCardDecoration}>学习</div>
        </div>

        <div className={styles.profile}>
          <div className={styles.avatar}>H</div>
          <div className={styles.profileInfo}>
            <strong>My profile</strong>
            <span>HSK 1 · Beginner</span>
          </div>
          <Settings size={17} className={styles.profileSettings} />
        </div>
      </div>
    </aside>
  );
}
