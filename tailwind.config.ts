import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        xl: "var(--radius)",
        "2xl": "calc(var(--radius) + 6px)",
      },
    },
  },
  plugins: [],
};
export default config;
