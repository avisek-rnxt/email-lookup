export type O365Result = 'valid' | 'valid_throttled' | 'invalid' | 'invalid_throttled' | 'throttled' | 'error';

export async function o365DomainManaged(domain: string, timeoutMs = 10000): Promise<boolean> {
  const url = `https://login.microsoftonline.com/getuserrealm.srf?login=probe@${encodeURIComponent(domain)}&json=1`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return false;
    const data = await res.json() as { NameSpaceType?: string };
    return data.NameSpaceType === 'Managed' || data.NameSpaceType === 'Federated';
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function o365Verify(email: string, timeoutMs = 10000): Promise<O365Result> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch('https://login.microsoftonline.com/common/GetCredentialType', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ Username: email }),
      signal: ctrl.signal,
    });
    if (!res.ok) return 'error';
    const data = await res.json() as { IfExistsResult?: number; ThrottleStatus?: number };
    const existsR = data.IfExistsResult;
    const throttle = data.ThrottleStatus ?? 0;
    if (existsR === 0 || existsR === 5 || existsR === 6) return throttle ? 'valid_throttled' : 'valid';
    if (existsR === 1) return throttle ? 'invalid_throttled' : 'invalid';
    return throttle ? 'throttled' : 'error';
  } catch {
    return 'error';
  } finally {
    clearTimeout(t);
  }
}
