import { useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((open) => !open);

  return (
    <div className={styles.appShell}>
      <Sidebar isOpen={menuOpen} onNavigate={closeMenu} />

      <main className={styles.mainContent}>
        <Topbar onMenuClick={toggleMenu} />
        <Outlet />
      </main>
    </div>
  );
}
