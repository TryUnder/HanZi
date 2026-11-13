
import { BrowserRouter } from "react-router";
import { AuthProvider } from "../features/auth/application/AuthContext";
import { AppRouter } from "./router";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
