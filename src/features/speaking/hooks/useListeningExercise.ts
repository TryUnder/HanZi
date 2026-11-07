import { useCallback, useMemo, useState } from "react";
import type {
  ListeningExerciseMode,
  ListeningQuestion,
} from "../types/speaking";
import { generateListeningQuestions } from "../utils/ListeningQuestionGenerator";

export type ListeningExercisePhase =
  "intro" | "question" | "feedback" | "complete";

interface UseListeningExerciseReturn {
  phase: ListeningExercisePhase;
  mode: ListeningExerciseMode;
  questions: ListeningQuestion[];
  currentQuestion: ListeningQuestion | undefined;
  questionIndex: number;
  score: number;
  selectedAnswer: string | null;
  isCorrect: boolean;
  progress: number;
  start: (selectedMode: ListeningExerciseMode) => void;
  answer: (value: string) => void;
  next: () => void;
  reset: () => void;
}

export function useListeningExercise(): UseListeningExerciseReturn {
  const [phase, setPhase] = useState<ListeningExercisePhase>("intro");
  const [mode, setMode] = useState<ListeningExerciseMode>("character");
  const [questions, setQuestions] = useState<ListeningQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const currentQuestion = questions[questionIndex];

  const isCorrect =
    currentQuestion !== undefined &&
    selectedAnswer === currentQuestion.correctAnswer;

  const progress = useMemo(() => {
    if (questions.length === 0) {
      return 0;
    }

    return ((questionIndex + 1) / questions.length) * 100;
  }, [questionIndex, questions.length]);

  const start = useCallback((selectedMode: ListeningExerciseMode) => {
    const generatedQuestions = generateListeningQuestions(selectedMode);

    if (generatedQuestions.length === 0) {
      return;
    }

    setMode(selectedMode);
    setQuestions(generatedQuestions);
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setPhase("question");
  }, []);

  const answer = useCallback(
    (value: string) => {
      if (phase !== "question" || !currentQuestion) {
        return;
      }

      setSelectedAnswer(value);

      if (value === currentQuestion.correctAnswer) {
        setScore((previousScore) => previousScore + 1);
      }

      setPhase("feedback");
    },
    [currentQuestion, phase],
  );

  const next = useCallback(() => {
    if (phase !== "feedback") {
      return;
    }

    if (questionIndex + 1 >= questions.length) {
      setPhase("complete");
      return;
    }

    setQuestionIndex((previousIndex) => previousIndex + 1);
    setSelectedAnswer(null);
    setPhase("question");
  }, [phase, questionIndex, questions.length]);

  const reset = useCallback(() => {
    setPhase("intro");
    setQuestions([]);
    setQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
  }, []);

  return {
    phase,
    mode,
    questions,
    currentQuestion,
    questionIndex,
    score,
    selectedAnswer,
    isCorrect,
    progress,
    start,
    answer,
    next,
    reset,
  };
}
