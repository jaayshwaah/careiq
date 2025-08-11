import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  // In v4 you don't need `content`, it's automatic.
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
