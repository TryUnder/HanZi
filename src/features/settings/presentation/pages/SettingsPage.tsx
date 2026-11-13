import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Settings2,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../../auth/hooks/useAuth";
import { getDefaultHskLevel } from "../../domain/rules/userSettingsValidation";
import { useUserSettings } from "../hooks/useUserSettings";

import styles from "./SettingsPage.module.css";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SettingsPage() {
  const { user } = useAuth();

  const {
    userSettings,
    settings,
    isLoading,
    isSaving,
    error,
    updateSettings,
    refreshSettings,
  } = useUserSettings();

  const defaultHskLevel = getDefaultHskLevel(settings);

  function handleDefaultHskLevelChange(value: string) {
    const nextLevel = value === "all" ? "all" : Number(value);

    void updateSettings({
      defaultHskLevel: nextLevel,
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>HANZI LEARNING STUDIO</span>
          <h1>Settings</h1>
          <p>Manage your account and personalize your learning experience.</p>
        </div>

        <div className={styles.headerIcon}>
          <Settings2 size={24} />
        </div>
      </header>

      {error && (
        <div className={styles.errorMessage} role="alert">
          <div className={styles.errorContent}>
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>

          <button
            type="button"
            className={styles.retryButton}
            onClick={() => void refreshSettings()}
            disabled={isLoading}
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <UserRound size={18} />
          </div>

          <div>
            <h2>Account</h2>
            <p>Your account information.</p>
          </div>
        </div>

        <div className={styles.settingsCard}>
          <div className={styles.accountInfo}>
            <div className={styles.avatar}>
              <UserRound size={22} />
            </div>

            <div className={styles.accountDetails}>
              <span className={styles.fieldLabel}>Email address</span>
              <strong>{user?.email ?? "Not available"}</strong>
            </div>
          </div>

          <div className={styles.accountStatus}>
            <CheckCircle2 size={16} />
            <span>Authenticated</span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <SlidersHorizontal size={18} />
          </div>

          <div>
            <h2>Preferences</h2>
            <p>Customize how you use HanZi.</p>
          </div>
        </div>

        <div className={styles.settingsCard}>
          <div className={styles.preferenceInfo}>
            <strong>Default HSK level</strong>
            <p>
              Choose which HSK level should be selected by default in your
              character and vocabulary libraries.
            </p>
          </div>

          <div className={styles.preferenceControl}>
            <select
              value={defaultHskLevel}
              onChange={(event) =>
                handleDefaultHskLevelChange(event.target.value)
              }
              disabled={isLoading || isSaving}
              aria-label="Default HSK level"
            >
              <option value="all">All levels</option>
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <option key={level} value={level}>
                  HSK {level}
                </option>
              ))}
            </select>

            <span className={styles.preferenceStatus} aria-live="polite">
              {isLoading
                ? "Loading preference..."
                : isSaving
                  ? "Saving..."
                  : error
                    ? "Could not save preference"
                    : "Saved to your account"}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionIcon}>
            <Settings2 size={18} />
          </div>

          <div>
            <h2>Data synchronization</h2>
            <p>Your settings are stored in your account.</p>
          </div>
        </div>

        <div className={styles.settingsCard}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <span className={styles.spinner} />
              <span>Loading settings...</span>
            </div>
          ) : error ? (
            <div className={styles.syncStatus}>
              <AlertCircle size={18} />
              <div>
                <strong>Unable to load settings</strong>
                <span>Check your connection and try again.</span>
              </div>
            </div>
          ) : userSettings ? (
            <div className={styles.syncStatus}>
              <CheckCircle2 size={18} />

              <div>
                <strong>Settings synchronized</strong>
                <span>Last updated: {formatDate(userSettings.updatedAt)}</span>
              </div>
            </div>
          ) : (
            <div className={styles.syncStatus}>
              <AlertCircle size={18} />

              <div>
                <strong>Settings unavailable</strong>
                <span>No settings record is currently loaded.</span>
              </div>
            </div>
          )}

          <button
            type="button"
            className={styles.refreshButton}
            onClick={() => void refreshSettings()}
            disabled={isLoading || isSaving}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </section>
    </div>
  );
}
