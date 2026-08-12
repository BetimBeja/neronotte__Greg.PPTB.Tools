import { useCallback, useEffect, useState } from "react";

export function useConnection() {
  const [connection, setConnection] =
    useState<ToolBoxAPI.Connection | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshConnection = useCallback(async () => {
    try {
      const conn = await window.toolboxAPI.connections.getActiveConnection();
      setConnection(conn);
    } catch (error) {
      console.error("Error refreshing connection:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshConnection();
  }, [refreshConnection]);

  return { connection, isLoading, refreshConnection };
}

export function useToolboxEvents(onEvent: (event: string, data: any) => void) {
  useEffect(() => {
    const handler = (_event: any, payload: ToolBoxAPI.ToolBoxEventPayload) => {
      onEvent(payload.event, payload.data);
    };

    window.toolboxAPI.events.on(handler);

    return () => {
      // Note: Current API doesn't support unsubscribe
      // This would need to be added to the API
    };
  }, [onEvent]);
}

/**
 * Tracks the current PPTB host UI theme (light/dark) so the tool's own chrome
 * (not the previewed model-driven app theme) can follow it.
 */
export function useHostTheme() {
  const [hostTheme, setHostTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    let cancelled = false;

    const getTheme = async () => {
      try {
        const currentTheme = await window.toolboxAPI.utils.getCurrentTheme();
        if (!cancelled) {
          setHostTheme(currentTheme === "dark" ? "dark" : "light");
        }
      } catch (error) {
        console.error("Error getting current theme:", error);
      }
    };

    getTheme();

    return () => {
      cancelled = true;
    };
  }, []);

  return hostTheme;
}

/**
 * A piece of UI preference persisted through `toolboxAPI.settings` under a
 * namespaced key (docs/IMPLEMENTATION_PLAN.md §2.12). Transient state must not
 * use this hook — only preferences worth restoring on the next launch.
 */
export function usePersistedSetting<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await window.toolboxAPI.settings.get(key);
        if (!cancelled && stored !== undefined && stored !== null) {
          setValue(stored as T);
        }
      } catch (error) {
        console.error(`Error reading the "${key}" setting:`, error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      window.toolboxAPI.settings.set(key, next).catch((error) => console.error(`Error saving the "${key}" setting:`, error));
    },
    [key],
  );

  return [value, update];
}
