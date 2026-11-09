import {
  ArrowLeft,
  BookOpen,
  Headphones,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { Link, useParams } from "react-router";
import { resolveLessonItems } from "../application/services/lessonContentService";
import { getCourseById, getLessonById } from "../repositories/courseRepository";
import { LessonVocabulary } from "../components/LessonVocabulary";
import styles from "./LessonPage.module.css";
import { VocabularyExercise } from "../components/exercises/VocabularyExercise";

const activityIcons = {
  vocabulary: BookOpen,
  pronunciation: Headphones,
  writing: PenLine,
  listening: Headphones,
  review: RotateCcw,
} as const;

export function LessonPage() {
  const { courseId, lessonId } = useParams();

  const course = courseId ? getCourseById(courseId) : undefined;
  const lesson = lessonId ? getLessonById(lessonId) : undefined;

  const isValidLesson =
    course !== undefined &&
    lesson !== undefined &&
    lesson.courseId === course.id &&
    course.lessonIds.includes(lesson.id);

  if (!isValidLesson) {
    return (
      <main className={styles.page}>
        <Link to="/courses" className={styles.backLink}>
          <ArrowLeft size={16} />
          All courses
        </Link>

        <section className={styles.notFound}>
          <BookOpen size={30} />
          <h1>Lesson not found</h1>
          <p>The requested lesson does not exist in this course.</p>
        </section>
      </main>
    );
  }

  const content = resolveLessonItems(lesson.items);
  const vocabularyCount = content.items.filter(
    (item) => item.kind === "vocabulary",
  ).length;

  return (
    <main className={styles.page}>
      <Link to={`/courses/${course.id}`} className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to {course.title}
      </Link>

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>
            HSK {course.level} · LESSON {String(lesson.order).padStart(2, "0")}
          </span>

          <h1>{lesson.title}</h1>
          <p>{lesson.description}</p>

          <div className={styles.stats}>
            <span>
              <BookOpen size={16} />
              {vocabularyCount} vocabulary words
            </span>
            <span>{lesson.activities.length} learning activities</span>
          </div>
        </div>

        <div className={styles.levelBadge}>
          <span>HSK</span>
          <strong>{course.level}</strong>
        </div>
      </header>

      <section className={styles.activitiesSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>LEARNING PLAN</span>
            <h2>Lesson activities</h2>
          </div>
        </div>

        <div className={styles.activityList}>
          {lesson.activities.map((activity) => {
            const Icon = activityIcons[activity.type];

            return (
              <article className={styles.activityCard} key={activity.id}>
                <div className={styles.activityIcon}>
                  <Icon size={19} />
                </div>

                <div className={styles.activityContent}>
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <VocabularyExercise items={content.items} />

      {content.missingItems.length > 0 && (
        <div className={styles.warning} role="status">
          Some lesson references could not be found in the Library:{" "}
          {content.missingItems.length}
        </div>
      )}

      <LessonVocabulary items={content.items} />
    </main>
  );
}
