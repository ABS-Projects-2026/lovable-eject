import { createClient } from "@lovable.dev/cloud-auth-js";

export const lovable = createClient({
  projectId: "abc123",
  redirectUri: "https://habit-buddy.lovable.app/callback",
});

export default lovable;
