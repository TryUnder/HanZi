import { useState } from "react";
import {
  LayoutDashboard,
  PenLine,
  Headphones,
  Layers,
  Library,
  Settings,
  HelpCircle,
  Search,
  Flame,
  Target,
  Sparkles,
  Volume2,
  Play,
  ChevronRight,
  Plus,
  BookOpen,
  Menu,
} from "lucide-react";
import "./App.css";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Writing", icon: PenLine },
  { label: "Speaking", icon: Headphones },
  { label: "Flashcards", icon: Layers },
  { label: "Library", icon: Library },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-symbol">汉</div>
          <div>
            <div className="brand-name">HanZi</div>
            <div className="brand-subtitle">CHINESE STUDIO</div>
          </div>
        </div>

        <div className="sidebar-label">MENU</div>

        <nav className="navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={`nav-item ${
                  activePage === item.label ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.label);
                  setMenuOpen(false);
                }}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.label === "Flashcards" && (
                  <span className="nav-count">12</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-label">PREFERENCES</div>

          <button className="nav-item">
            <Settings size={19} strokeWidth={1.8} />
            <span>Settings</span>
          </button>

          <button className="nav-item">
            <HelpCircle size={19} strokeWidth={1.8} />
            <span>Help center</span>
          </button>

          <div className="sidebar-card">
            <div className="sidebar-card-icon">
              <Sparkles size={18} />
            </div>
            <strong>Keep learning!</strong>
            <p>Small steps every day lead to big progress.</p>
            <div className="sidebar-card-decoration">学习</div>
          </div>

          <div className="profile">
            <div className="avatar">H</div>
            <div className="profile-info">
              <strong>My profile</strong>
              <span>HSK 1 · Beginner</span>
            </div>
            <Settings size={17} className="profile-settings" />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search anything..." />
              <kbd>⌘ K</kbd>
            </div>
            <div className="topbar-level">
              <span className="level-dot" />
              Beginner
            </div>
          </div>
        </header>

        <div className="dashboard">
          <section className="welcome-section">
            <div>
              <div className="eyebrow">
                <Sparkles size={15} />
                YOUR LEARNING JOURNEY
              </div>
              <h1>
                你好, welcome back<span>.</span>
              </h1>
              <p className="welcome-description">
                Every character brings you closer to fluency. Let's make today
                count.
              </p>
            </div>

            <div className="welcome-date">
              <span className="date-label">YOUR DAILY JOURNEY</span>
              <strong>Day 01</strong>
              <span className="date-subtitle">A new beginning</span>
            </div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon purple">
                  <Flame size={19} />
                </div>
                <span className="stat-caption">DAILY STREAK</span>
              </div>
              <div className="stat-value">
                0 <span>days</span>
              </div>
              <p>Start your learning streak today</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon orange">
                  <Target size={19} />
                </div>
                <span className="stat-caption">DAILY GOAL</span>
              </div>
              <div className="stat-value">
                0 <span>/ 20 min</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: "0%" }} />
              </div>
              <p>20 minutes of focused learning</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon green">
                  <BookOpen size={19} />
                </div>
                <span className="stat-caption">CHARACTERS LEARNED</span>
              </div>
              <div className="stat-value">
                0 <span>characters</span>
              </div>
              <p>Your vocabulary starts here</p>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <div className="stat-icon blue">
                  <Layers size={19} />
                </div>
                <span className="stat-caption">REVIEW QUEUE</span>
              </div>
              <div className="stat-value">
                12 <span>cards</span>
              </div>
              <p>Ready when you are</p>
            </div>
          </section>

          <section className="content-grid">
            <div className="main-column">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">
                    PICK UP WHERE YOU LEFT OFF
                  </span>
                  <h2>Continue learning</h2>
                </div>
                <button className="text-button">
                  View all <ChevronRight size={16} />
                </button>
              </div>

              <div className="continue-card">
                <div className="continue-art">
                  <span className="art-small">你好</span>
                  <span className="art-character">学</span>
                  <span className="art-caption">LEARN SOMETHING NEW</span>
                </div>

                <div className="continue-info">
                  <div className="lesson-tag">YOUR FIRST LESSON</div>
                  <h3>Getting started with Chinese</h3>
                  <p>
                    Learn the basics of Mandarin, discover Pinyin and meet your
                    first Chinese characters.
                  </p>
                  <div className="lesson-meta">
                    <span>
                      <BookOpen size={15} /> 5 min
                    </span>
                    <span>
                      <Layers size={15} /> Beginner
                    </span>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => setActivePage("Library")}
                  >
                    Start learning <Play size={15} fill="currentColor" />
                  </button>
                </div>
              </div>

              <div className="section-heading activity-heading">
                <div>
                  <span className="section-kicker">BUILD YOUR ROUTINE</span>
                  <h2>Your learning path</h2>
                </div>
              </div>

              <div className="learning-path">
                <button
                  className="path-card"
                  onClick={() => setActivePage("Writing")}
                >
                  <div className="path-icon writing-icon">
                    <PenLine size={21} />
                  </div>
                  <div className="path-copy">
                    <strong>Writing</strong>
                    <span>Practice Chinese characters</span>
                  </div>
                  <ChevronRight size={18} />
                </button>

                <button
                  className="path-card"
                  onClick={() => setActivePage("Speaking")}
                >
                  <div className="path-icon speaking-icon">
                    <Volume2 size={21} />
                  </div>
                  <div className="path-copy">
                    <strong>Speaking</strong>
                    <span>Train pronunciation and tones</span>
                  </div>
                  <ChevronRight size={18} />
                </button>

                <button
                  className="path-card"
                  onClick={() => setActivePage("Flashcards")}
                >
                  <div className="path-icon flashcard-icon">
                    <Layers size={21} />
                  </div>
                  <div className="path-copy">
                    <strong>Flashcards</strong>
                    <span>Remember words for longer</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="right-column">
              <div className="section-heading">
                <div>
                  <span className="section-kicker">A LITTLE EVERY DAY</span>
                  <h2>Daily challenge</h2>
                </div>
              </div>

              <div className="challenge-card">
                <div className="challenge-top">
                  <span className="challenge-label">CHARACTER OF THE DAY</span>
                  <span className="challenge-badge">HSK 1</span>
                </div>

                <div className="character-display">好</div>
                <h3>hǎo</h3>
                <p className="character-meaning">good · well</p>

                <div className="character-divider" />

                <div className="character-details">
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

                <button className="audio-button">
                  <Volume2 size={17} />
                  Listen to pronunciation
                </button>
              </div>

              <div className="quote-card">
                <div className="quote-icon">“</div>
                <p>千里之行，始于足下。</p>
                <span>
                  A journey of a thousand miles begins with a single step.
                </span>
                <div className="quote-author">— Chinese proverb</div>
              </div>

              <button className="add-goal-button">
                <Plus size={17} />
                Customize your daily goal
              </button>
            </div>
          </section>

          <footer className="footer">
            <span>HanZi Chinese Learning Studio</span>
            <span>慢慢来 · Take it one step at a time</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

export default App;
