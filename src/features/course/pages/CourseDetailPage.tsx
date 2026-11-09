import { ArrowLeft, BookOpen, ChevronRight, Clock } from "lucide-react";
import { Link, useParams } from "react-router";
import {
  getCourseById,
  getLessonsByCourseId,
} from "../repositories/courseRepository";
import styles from "./CourseDetailPage.module.css";

export function CourseDetailPage() {
  const { courseId } = useParams();

  const course = courseId ? getCourseById(courseId) : undefined;
  const lessons = courseId ? getLessonsByCourseId(courseId) : [];

  if (!course) {
    return (
      <main className={styles.page}>
        <Link to="/courses" className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to courses
        </Link>
        <h1>Course not found</h1>
        <p>The selected course does not exist or is not available yet.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Link to="/courses" className={styles.backLink}>
        <ArrowLeft size={16} />
        All courses
      </Link>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>CHINESE LEARNING PATH</span>
          <h1>{course.title}</h1>
          <p>{course.description}</p>

          <div className={styles.stats}>
            <span>
              <BookOpen size={17} />
              {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
            </span>
            <span>
              <Clock size={17} />
              Beginner level
            </span>
          </div>
        </div>

        <div className={styles.levelBadge}>
          <span>HSK</span>
          <strong>{course.level}</strong>
        </div>
      </header>

      <section className={styles.lessonSection}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>YOUR CURRICULUM</span>
            <h2>Course lessons</h2>
          </div>
          <span className={styles.lessonCount}>{lessons.length} available</span>
        </div>

        {lessons.length === 0 ? (
          <div className={styles.emptyState}>
            <BookOpen size={28} />
            <h3>No lessons available</h3>
            <p>Lessons for this course are being prepared.</p>
          </div>
        ) : (
          <div className={styles.lessonList}>
            {lessons.map((lesson) => (
              <article key={lesson.id} className={styles.lessonCard}>
                <div className={styles.lessonNumber}>
                  {String(lesson.order).padStart(2, "0")}
                </div>

                <div className={styles.lessonContent}>
                  <span className={styles.lessonLabel}>
                    LESSON {lesson.order}
                  </span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.description}</p>

                  <div className={styles.activities}>
                    {lesson.activities.map((activity) => (
                      <span key={activity.id}>{activity.title}</span>
                    ))}
                  </div>
                </div>

                <Link
                  to={`/courses/${course.id}/lessons/${lesson.id}`}
                  className={styles.lessonAction}
                  aria-label={`Open lesson ${lesson.title}`}
                >
                  <ChevronRight size={20} />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
