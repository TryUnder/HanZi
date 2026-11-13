import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { BookOpen, LockKeyhole, Mail } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import styles from "./LoginPage.module.css";

export function LoginPage() {
  const { user, isLoading, signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <div className={styles.loadingScreen}>Checking your session...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    const result = await signIn(email.trim(), password);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.loginCard}>
        <div className={styles.brand}>
          <div className={styles.brandSymbol}>汉</div>
          <div>
            <div className={styles.brandName}>HanZi</div>
            <div className={styles.brandSubtitle}>CHINESE LEARNING STUDIO</div>
          </div>
        </div>

        <div className={styles.heading}>
          <div className={styles.eyebrow}>WELCOME BACK</div>
          <h1>Sign in to HanZi</h1>
          <p>Continue your Mandarin learning journey.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Email address</span>
            <div className={styles.inputWrapper}>
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="username"
                required
                disabled={isSubmitting}
              />
            </div>
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <div className={styles.inputWrapper}>
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                disabled={isSubmitting}
              />
            </div>
          </label>

          <div className={styles.forgotPassword}>
            <Link to="/reset-password">Forgot password?</Link>
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <button
            className={styles.submitButton}
            type="submit"
            disabled={isSubmitting || !email.trim() || !password}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className={styles.footer}>
          <BookOpen size={16} />
          <span>Your personal Mandarin learning space</span>
        </div>
      </section>
    </main>
  );
}
