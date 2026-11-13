
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Mail } from "lucide-react";

import { supabase } from "../../../services/supabase/supabaseClient";
import styles from "./LoginPage.module.css";

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/set-password`,
        });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Unable to connect to the authentication service.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
          <div className={styles.eyebrow}>ACCOUNT RECOVERY</div>
          <h1>Reset your password</h1>
          <p>
            Enter your email address. We will send you a link to set a new
            password.
          </p>
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
                autoComplete="email"
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

          {success && (
            <div className={styles.success} role="status">
              If an account exists for this email, a password reset link
              has been sent. Check your inbox and spam folder.
            </div>
          )}

          <button
            className={styles.submitButton}
            type="submit"
            disabled={isSubmitting || !email.trim()}
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login">Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
