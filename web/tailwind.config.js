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
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "view-enter": "viewEnter 200ms ease-out",
        "success-ripple": "successRipple 800ms ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(34, 211, 238, 0)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(34, 211, 238, 0.15)" },
        },
        viewEnter: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        successRipple: {
          "0%": {
            transform: "scale(1)",
            opacity: "0.5",
            boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.4)",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "0",
            boxShadow: "0 0 0 40px rgba(16, 185, 129, 0)",
          },
        },
      },
    },
  },
  plugins: [],
};
