import { hsk1Course, hsk1Lessons } from "../data/hsk/hsk1";
import type { Course } from "../domain/types/course";
import type { Lesson } from "../domain/types/lesson";

const courses: readonly Course[] = [hsk1Course];

const lessons: readonly Lesson[] = [...hsk1Lessons];

const coursesById = new Map(courses.map((course) => [course.id, course]));

const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));

export function getAllCourses(): readonly Course[] {
  return courses;
}

export function getCourseById(id: string): Course | undefined {
  return coursesById.get(id);
}

export function getLessonById(id: string): Lesson | undefined {
  return lessonsById.get(id);
}

export function getLessonsByCourseId(courseId: string): readonly Lesson[] {
  const course = getCourseById(courseId);

  if (!course) {
    return [];
  }

  return course.lessonIds.flatMap((lessonId) => {
    const lesson = getLessonById(lessonId);

    return lesson ? [lesson] : [];
  });
}
