/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx,js,jsx}",
    "./src/components/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "hsl(0 0% 100%)",
          dark: "hsl(222 14% 10%)",
        },
        ink: {
          DEFAULT: "hsl(222 22% 12%)",
          subtle: "hsl(222 10% 40%)",
          dark: "hsl(0 0% 98%)",
        },
        glass: "hsla(0,0%,100%,0.6)",
        accent: {
          DEFAULT: "hsl(212 100% 48%)",
          fg: "white",
          soft: "hsl(212 100% 96%)",
        },
        border: "hsl(220 14% 90%)",
        "border-dark": "hsl(220 14% 20%)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(0,0,0,0.08)",
        softdark: "0 8px 24px rgba(0,0,0,0.35)",
        insetglass: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      backdropBlur: { xs: "2px" },
      transitionTimingFunction: { ios: "cubic-bezier(.22,.61,.36,1)" },
      keyframes: {
        fadeUp: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
      },
      animation: { fadeUp: "fadeUp .3s ease-out both" },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
