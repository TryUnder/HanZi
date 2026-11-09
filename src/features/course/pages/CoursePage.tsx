import { BookOpen, Lock, Play } from "lucide-react";
import { Link } from "react-router";
import { getAllCourses } from "../repositories/courseRepository";
import styles from "./CoursesPage.module.css";

const levels = [
  {
    level: 1,
    name: "Beginner",
    description: "Podstawowe słownictwo i codzienne zwroty.",
    vocabulary: "150 słów",
  },
  {
    level: 2,
    name: "Elementary",
    description: "Proste rozmowy i sytuacje dnia codziennego.",
    vocabulary: "300 słów",
  },
  {
    level: 3,
    name: "Intermediate",
    description: "Rozwijanie komunikacji w typowych sytuacjach.",
    vocabulary: "600 słów",
  },
  {
    level: 4,
    name: "Upper Intermediate",
    description: "Swobodniejsze wypowiedzi i bogatsze słownictwo.",
    vocabulary: "1200 słów",
  },
  {
    level: 5,
    name: "Advanced",
    description: "Rozumienie bardziej złożonych tekstów.",
    vocabulary: "2500 słów",
  },
  {
    level: 6,
    name: "Mastery",
    description: "Zaawansowana komunikacja w języku chińskim.",
    vocabulary: "5000 słów",
  },
];

export function CoursesPage() {
  const courses = getAllCourses();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>YOUR LEARNING PATH</span>
          <h1>Chinese courses</h1>
          <p>Wybierz poziom HSK i rozwijaj swoje umiejętności krok po kroku.</p>
        </div>

        <div className={styles.levelSummary}>
          <BookOpen size={20} />
          <span>6 poziomów HSK</span>
        </div>
      </header>

      <section className={styles.grid}>
        {levels.map((item) => {
          const course = courses.find((entry) => entry.level === item.level);

          const isAvailable = Boolean(course);

          return (
            <article
              key={item.level}
              className={`${styles.card} ${
                isAvailable ? styles.available : styles.locked
              }`}
            >
              <div className={styles.cardTop}>
                <span className={styles.levelLabel}>HSK LEVEL</span>
                <span className={styles.levelNumber}>{item.level}</span>
              </div>

              <div className={styles.cardContent}>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
              </div>

              <div className={styles.cardFooter}>
                <span>{item.vocabulary}</span>

                {course ? (
                  <Link to={`/courses/${course.id}`} className={styles.action}>
                    <Play size={15} />
                    Start learning
                  </Link>
                ) : (
                  <span className={styles.lockedLabel}>
                    <Lock size={14} />
                    Coming soon
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
