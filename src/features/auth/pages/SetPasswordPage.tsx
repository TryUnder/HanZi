import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { LockKeyhole } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { supabase } from "../../../services/supabase/supabaseClient";
import styles from "./LoginPage.module.css";

export function SetPasswordPage() {
  const { user, isLoading } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return <div className={styles.loadingScreen}>Checking your session...</div>;
  }

  if (!user) {
    return (
      <main className={styles.page}>
        <section className={styles.loginCard}>
          <div className={styles.brand}>
            <div className={styles.brandSymbol}>汉</div>
            <div>
              <div className={styles.brandName}>HanZi</div>
              <div className={styles.brandSubtitle}>
                CHINESE LEARNING STUDIO
              </div>
            </div>
          </div>

          <div className={styles.heading}>
            <div className={styles.eyebrow}>LINK EXPIRED</div>
            <h1>Unable to set password</h1>
            <p>
              This link is invalid or has expired. Request a new password reset
              link and try again.
            </p>
          </div>

          <Link to="/reset-password" className={styles.submitButton}>
            Request a new link
          </Link>
        </section>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Unable to update your password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return <Navigate to="/dashboard" replace />;
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
          <div className={styles.eyebrow}>ACCOUNT SECURITY</div>
          <h1>Set your password</h1>
          <p>Choose a new password for your HanZi account.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>New password</span>
            <div className={styles.inputWrapper}>
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={isSubmitting}
              />
            </div>
          </label>

          <label className={styles.field}>
            <span>Confirm password</span>
            <div className={styles.inputWrapper}>
              <LockKeyhole size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
              />
            </div>
          </label>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          <button
            className={styles.submitButton}
            type="submit"
            disabled={isSubmitting || !password || !confirmPassword}
          >
            {isSubmitting ? "Saving..." : "Save password"}
          </button>
        </form>
      </section>
    </main>
  );
}
