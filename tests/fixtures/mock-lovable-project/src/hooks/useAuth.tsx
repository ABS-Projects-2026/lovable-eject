import { lovable } from "@/integrations/lovable";

export function useAuth() {
  const signIn = async (provider: string) => {
    const callbackUrl = window.location.origin + "/callback";
    await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: callbackUrl,
    });
  };

  return { signIn };
}
