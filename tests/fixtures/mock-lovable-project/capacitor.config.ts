import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.abc123",
  appName: "Habit Buddy",
  webDir: "dist",
  server: {
    url: "https://habit-buddy.lovable.app",
  },
  plugins: {
    App: {
      launchUrl: "app.lovable.abc123://callback",
    },
  },
};

export default config;
