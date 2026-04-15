import { promises as dns } from 'node:dns';

export async function getMxHost(domain: string): Promise<string | null> {
  try {
    const records = await dns.resolveMx(domain);
    if (!records.length) return null;
    records.sort((a, b) => a.priority - b.priority);
    return records[0].exchange.replace(/\.$/, '');
  } catch {
    return null;
  }
}

const SKIP_PROVIDERS = ['mail.protection.outlook.com', 'pphosted.com', 'mimecast.com'];

export function skipProvider(mx: string): string | null {
  const lower = mx.toLowerCase();
  return SKIP_PROVIDERS.find(p => lower.includes(p)) ?? null;
}
