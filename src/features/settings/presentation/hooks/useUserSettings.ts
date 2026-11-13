import { useCallback, useEffect, useRef, useState } from "react";

import { userSettingsService } from "../../../../app/services/userSettingsService";
import { useAuth } from "../../../auth/hooks/useAuth";

import type {
  UserSettings,
  UserSettingsObject,
} from "../../domain/types/userSettings";

interface UseUserSettingsResult {
  readonly userSettings: UserSettings | null;
  readonly settings: UserSettingsObject | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly error: string | null;
  readonly saveSettings: (
    settings: UserSettingsObject,
  ) => Promise<UserSettings | null>;
  readonly updateSettings: (
    updates: UserSettingsObject,
  ) => Promise<UserSettings | null>;
  readonly refreshSettings: () => Promise<void>;
}

interface LoadedSettingsState {
  readonly userId: string;
  readonly data: UserSettings | null;
}

interface ErrorState {
  readonly userId: string;
  readonly message: string;
}

interface SavingState {
  readonly userId: string;
  readonly isSaving: boolean;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to process user settings.";
}

export function useUserSettings(): UseUserSettingsResult {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;

  const [loadedState, setLoadedState] = useState<LoadedSettingsState | null>(
    null,
  );

  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  const [savingState, setSavingState] = useState<SavingState | null>(null);

  const operationIdRef = useRef(0);

  useEffect(() => {
    if (isAuthLoading || !userId) {
      return;
    }

    let isActive = true;
    const operationId = ++operationIdRef.current;

    void userSettingsService
      .getSettings()
      .then((result) => {
        if (!isActive || operationIdRef.current !== operationId) {
          return;
        }

        setLoadedState({
          userId,
          data: result,
        });
      })
      .catch((caughtError: unknown) => {
        if (!isActive || operationIdRef.current !== operationId) {
          return;
        }

        setLoadedState({
          userId,
          data: null,
        });

        setErrorState({
          userId,
          message: getErrorMessage(caughtError),
        });
      });

    return () => {
      isActive = false;
    };
  }, [userId, isAuthLoading]);

  const refreshSettings = useCallback(async (): Promise<void> => {
    if (!userId || isAuthLoading) {
      return;
    }

    const operationId = ++operationIdRef.current;

    try {
      const result = await userSettingsService.getSettings();

      if (operationIdRef.current !== operationId) {
        return;
      }

      setLoadedState({
        userId,
        data: result,
      });
      setErrorState(null);
    } catch (caughtError) {
      if (operationIdRef.current !== operationId) {
        return;
      }

      setErrorState({
        userId,
        message: getErrorMessage(caughtError),
      });
    }
  }, [userId, isAuthLoading]);

  const saveSettings = useCallback(
    async (settings: UserSettingsObject): Promise<UserSettings | null> => {
      if (!userId || isAuthLoading) {
        return null;
      }

      const operationId = ++operationIdRef.current;

      setSavingState({
        userId,
        isSaving: true,
      });

      setErrorState(null);

      try {
        const result = await userSettingsService.saveSettings(settings);

        if (operationIdRef.current !== operationId) {
          return null;
        }

        setLoadedState({
          userId,
          data: result,
        });

        return result;
      } catch (caughtError) {
        if (operationIdRef.current === operationId) {
          setErrorState({
            userId,
            message: getErrorMessage(caughtError),
          });
        }

        return null;
      } finally {
        if (operationIdRef.current === operationId) {
          setSavingState({
            userId,
            isSaving: false,
          });
        }
      }
    },
    [userId, isAuthLoading],
  );

  const updateSettings = useCallback(
    async (updates: UserSettingsObject): Promise<UserSettings | null> => {
      if (!userId || isAuthLoading) {
        return null;
      }

      const operationId = ++operationIdRef.current;

      setSavingState({
        userId,
        isSaving: true,
      });

      setErrorState(null);

      try {
        const result = await userSettingsService.updateSettings(updates);

        if (operationIdRef.current !== operationId) {
          return null;
        }

        setLoadedState({
          userId,
          data: result,
        });

        return result;
      } catch (caughtError) {
        if (operationIdRef.current === operationId) {
          setErrorState({
            userId,
            message: getErrorMessage(caughtError),
          });
        }

        return null;
      } finally {
        if (operationIdRef.current === operationId) {
          setSavingState({
            userId,
            isSaving: false,
          });
        }
      }
    },
    [userId, isAuthLoading],
  );

  const userSettings = loadedState?.userId === userId ? loadedState.data : null;

  const settings = userSettings?.settings ?? null;

  const isLoading =
    isAuthLoading || (userId !== null && loadedState?.userId !== userId);

  const isSaving = savingState?.userId === userId && savingState.isSaving;

  const error = errorState?.userId === userId ? errorState.message : null;

  return {
    userSettings,
    settings,
    isLoading,
    isSaving,
    error,
    saveSettings,
    updateSettings,
    refreshSettings,
  };
}
