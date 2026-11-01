import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "../components/layout/AppLayout";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { PlaceholderPage } from "../features/shared/pages/PlaceholderPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/writing" element={<PlaceholderPage title="Writing" />} />
        <Route
          path="/speaking"
          element={<PlaceholderPage title="Speaking" />}
        />
        <Route
          path="/flashcards"
          element={<PlaceholderPage title="Flashcards" />}
        />
        <Route path="/library" element={<PlaceholderPage title="Library" />} />
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
