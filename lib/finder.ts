import { getMxHost, skipProvider } from './mx';
import { smtpVerify, isCatchAll } from './smtp';
import { o365DomainManaged, o365Verify } from './o365';
import { generatePatterns } from './patterns';

export type Status = 'valid' | 'accept-all' | 'not found';

export interface FindResult {
  email: string;
  status: Status;
  confidence: number;
  mx?: string | null;
}

function canary(domain: string): string {
  let h = 0;
  for (let i = 0; i < domain.length; i++) h = ((h << 5) - h + domain.charCodeAt(i)) | 0;
  return `zzq${Math.abs(h) % 999999}xnotreal@${domain}`;
}

export async function findEmail(first: string, last: string, domain: string): Promise<FindResult> {
  const mx = await getMxHost(domain);
  if (!mx) return { email: '', status: 'not found', confidence: 0, mx: null };

  const patterns = generatePatterns(first, last, domain);
  const top = patterns[0];
  const skip = skipProvider(mx);

  // O365 path
  if (skip && mx.toLowerCase().includes('mail.protection.outlook.com')) {
    if (!(await o365DomainManaged(domain))) {
      return { email: top.email, status: 'accept-all', confidence: +(top.score * 0.5).toFixed(2), mx };
    }
    const canaryResult = await o365Verify(canary(domain));
    if (canaryResult === 'valid' || canaryResult === 'valid_throttled') {
      return { email: top.email, status: 'accept-all', confidence: top.score, mx };
    }

    const hits: Array<{ email: string; score: number }> = [];
    for (const p of patterns) {
      const r = await o365Verify(p.email);
      if (r === 'valid' || r === 'valid_throttled') {
        hits.push(p);
        if (r === 'valid_throttled') break;
      } else if (r === 'throttled' || r === 'invalid_throttled') {
        break;
      }
    }
    if (hits.length) {
      const best = hits.reduce((a, b) => (a.score >= b.score ? a : b));
      return { email: best.email, status: 'valid', confidence: best.score, mx };
    }
    return { email: '', status: 'not found', confidence: 0, mx };
  }

  if (skip) {
    return { email: top.email, status: 'accept-all', confidence: +(top.score * 0.6).toFixed(2), mx };
  }

  // Normal SMTP
  const ca = await isCatchAll(domain, mx);
  if (ca === 'blocked') {
    return { email: top.email, status: 'accept-all', confidence: +(top.score * 0.5).toFixed(2), mx };
  }
  if (ca === 'yes') {
    return { email: top.email, status: 'accept-all', confidence: top.score, mx };
  }

  for (const p of patterns) {
    const r = await smtpVerify(p.email, mx);
    if (r === 'valid') return { email: p.email, status: 'valid', confidence: 1.0, mx };
    if (r === 'blocked') {
      return { email: top.email, status: 'accept-all', confidence: +(top.score * 0.5).toFixed(2), mx };
    }
  }
  return { email: '', status: 'not found', confidence: 0, mx };
}
