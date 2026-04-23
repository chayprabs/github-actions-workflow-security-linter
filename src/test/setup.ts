import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  window.localStorage.clear();
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  });
}
