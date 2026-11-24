import { getApiUrl } from './api-url';

export interface AuthConfig {
  providers: { google: boolean; discord?: boolean; github: boolean };
}

/** Shared query key so signin/signup share one cached auth-config fetch. */
export const authConfigQueryKey = ['auth-config'] as const;

export async function fetchAuthConfig(): Promise<AuthConfig> {
  const res = await fetch(`${getApiUrl().replace(/\/+$/, '')}/api/auth-config`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`auth-config failed (${res.status})`);
  return (await res.json()) as AuthConfig;
}
