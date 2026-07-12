/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        canvas: {
          DEFAULT: "#f6f6fb",
          subtle: "#eeeef7",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(49, 46, 129, 0.04), 0 1px 3px 1px rgba(49, 46, 129, 0.06)",
        glow: "0 8px 24px -8px rgba(79, 70, 229, 0.35)",
        "glow-lg": "0 16px 40px -12px rgba(79, 70, 229, 0.4)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(24px, -32px) scale(1.08)" },
          "66%": { transform: "translate(-18px, 14px) scale(0.94)" },
        },
        drift: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 -480px" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        blob: "blob 12s infinite ease-in-out",
        drift: "drift 14s linear infinite",
      },
    },
  },
  plugins: [],
}
