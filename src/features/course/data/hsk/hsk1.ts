import type { Course } from "../../domain/types/course";
import type { Lesson } from "../../domain/types/lesson";

export const hsk1Course = {
  id: "hsk-1",
  level: 1,
  title: "HSK 1",
  description: "Podstawy języka chińskiego – poziom początkujący.",
  lessonIds: ["hsk-1-lesson-01"],
} satisfies Course;

export const hsk1Lessons = [
  {
    id: "hsk-1-lesson-01",
    courseId: hsk1Course.id,
    order: 1,
    title: "Przedstawianie się",
    description:
      "Poznaj podstawowe zwroty potrzebne do przedstawienia siebie i innych osób.",
    items: [
      { kind: "vocabulary", id: "vocab-6211" }, // 我
      { kind: "vocabulary", id: "vocab-4f60" }, // 你
      { kind: "vocabulary", id: "vocab-597d" }, // 好
      { kind: "vocabulary", id: "vocab-53eb" }, // 叫
      { kind: "vocabulary", id: "vocab-540d-5b57" }, // 名字
      { kind: "vocabulary", id: "vocab-662f" }, // 是
      { kind: "vocabulary", id: "vocab-5417" }, // 吗
      { kind: "vocabulary", id: "vocab-8001-5e08" }, // 老师
      { kind: "vocabulary", id: "vocab-5b66-751f" }, // 学生
      { kind: "vocabulary", id: "vocab-8ba4-8bc6" }, // 认识
      { kind: "vocabulary", id: "vocab-518d-89c1" }, // 再见
      { kind: "vocabulary", id: "vocab-8c22-8c22" }, // 谢谢
    ],
    activities: [
      {
        id: "learn-vocabulary",
        type: "vocabulary",
        title: "Poznaj słownictwo",
        description: "Znaczenie, Pinyin i przykłady użycia.",
      },
      {
        id: "practice-pronunciation",
        type: "pronunciation",
        title: "Ćwicz wymowę",
        description: "Słuchaj nagrań i ćwicz tony.",
      },
      {
        id: "practice-writing",
        type: "writing",
        title: "Ćwicz pisanie",
        description: "Poznaj kolejność kresek znaków.",
      },
      {
        id: "review-lesson",
        type: "review",
        title: "Powtórka",
        description: "Sprawdź, ile zapamiętałeś.",
      },
    ],
  },
] satisfies readonly Lesson[];
