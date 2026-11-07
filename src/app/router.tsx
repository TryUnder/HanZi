import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { PlaceholderPage } from "../features/shared/pages/PlaceholderPage";
import { LibraryPage } from "../features/library/pages/LibraryPage";
import { VocabularyPage } from "../features/library/pages/VocabularyPage";
import { WritingPage } from "../features/writing/pages/WritingPage";
import SpeakingPage from "../features/speaking/pages/SpeakingPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
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
        <Route
          path="/settings"
          element={<PlaceholderPage title="Settings" />}
        />
        <Route path="/help" element={<PlaceholderPage title="Help center" />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
