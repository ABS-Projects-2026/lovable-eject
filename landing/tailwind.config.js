/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', "serif"],
        body: ['"Satoshi"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        surface: {
          DEFAULT: "#141416",
          2: "#1c1c20",
          3: "#242428",
        },
        border: "#2a2a30",
        accent: {
          DEFAULT: "#22d3ee",
          dim: "rgba(34, 211, 238, 0.1)",
        },
        warn: {
          DEFAULT: "#f59e0b",
          dim: "rgba(245, 158, 11, 0.1)",
        },
        success: {
          DEFAULT: "#10b981",
          dim: "rgba(16, 185, 129, 0.1)",
        },
        danger: {
          DEFAULT: "#ef4444",
          dim: "rgba(239, 68, 68, 0.1)",
        },
      },
    },
  },
  plugins: [],
};
