"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  defaultAnalyzerWorkspacePreferences,
  readStoredAnalyzerWorkspacePreferences,
  type ThemePreference,
  writeStoredAnalyzerWorkspacePreferences,
} from "@/features/actions-analyzer/lib/analyzer-preferences";

type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    return readStoredAnalyzerWorkspacePreferences().theme;
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    return getSystemPrefersDark();
  });
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    return preference === "system"
      ? systemPrefersDark
        ? "dark"
        : "light"
      : preference;
  }, [preference, systemPrefersDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleChange(event: MediaQueryListEvent) {
      setSystemPrefersDark(event.matches);
    }

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference: (nextPreference) => {
        setPreferenceState(nextPreference);
        const storedPreferences = readStoredAnalyzerWorkspacePreferences();

        writeStoredAnalyzerWorkspacePreferences({
          ...storedPreferences,
          theme: nextPreference,
        });
      },
    }),
    [preference, resolvedTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within <ThemeProvider>.");
  }

  return context;
}

function getSystemPrefersDark() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const initialThemeScript = `
(function () {
  try {
    var key = "authos.actions-analyzer.preferences.v1";
    var rawValue = window.localStorage.getItem(key);
    var parsedValue = rawValue ? JSON.parse(rawValue) : null;
    var preference = parsedValue && typeof parsedValue.theme === "string"
      ? parsedValue.theme
      : ${JSON.stringify(defaultAnalyzerWorkspacePreferences.theme)};
    var resolvedTheme = preference === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;
