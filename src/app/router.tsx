import { Navigate, Route, Routes } from "react-router";

import { AppLayout } from "../components/layout/AppLayout";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { LoginPage } from "../features/auth/pages/LoginPage";

import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { PlaceholderPage } from "../features/shared/pages/PlaceholderPage";
import { LibraryPage } from "../features/library/pages/LibraryPage";
import { VocabularyPage } from "../features/library/pages/VocabularyPage";
import { WritingPage } from "../features/writing/pages/WritingPage";
import SpeakingPage from "../features/speaking/pages/SpeakingPage";
import { CoursesPage } from "../features/course/pages/CoursePage";
import { CourseDetailPage } from "../features/course/pages/CourseDetailPage";
import { LessonPage } from "../features/course/pages/LessonPage";
import { PronunciationLabPage } from "../features/pronunciation/presentation/pages/PronunciationLabPage";
import { ResetPasswordPage } from "../features/auth/pages/ResetPasswordPage";
import { SetPasswordPage } from "../features/auth/pages/SetPasswordPage";
import { SettingsPage } from "../features/settings/presentation/pages/SettingsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dev/pronunciation-lab"
          element={<PronunciationLabPage />}
        />

        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />

          <Route
            path="/courses/:courseId/lessons/:lessonId"
            element={<LessonPage />}
          />

          <Route path="/writing" element={<WritingPage />} />
          <Route path="/speaking" element={<SpeakingPage />} />

          <Route
            path="/library"
            element={<Navigate to="/library/characters" replace />}
          />
          <Route path="/library/characters" element={<LibraryPage />} />
          <Route path="/library/vocabulary" element={<VocabularyPage />} />

          <Route
            path="/flashcards"
            element={<PlaceholderPage title="Flashcards" />}
          />
          <Route path="/settings" element={<SettingsPage />} />
          <Route
            path="/help"
            element={<PlaceholderPage title="Help center" />}
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
