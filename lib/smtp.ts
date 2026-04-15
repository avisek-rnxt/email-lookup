import net from 'node:net';

export type SmtpResult = 'valid' | 'invalid' | 'blocked' | 'error' | 'unknown';

export async function smtpVerify(email: string, mxHost: string, timeoutMs = 10000): Promise<SmtpResult> {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: mxHost, port: 25 });
    socket.setTimeout(timeoutMs);

    let buffer = '';
    let step = 0;
    let done = false;

    const finish = (r: SmtpResult) => {
      if (done) return;
      done = true;
      try { socket.end('QUIT\r\n'); } catch {}
      socket.destroy();
      resolve(r);
    };

    const send = (line: string) => socket.write(line + '\r\n');

    socket.on('data', chunk => {
      buffer += chunk.toString();
      // SMTP lines ending with \r\n; a "CODE-..." line means more to come, "CODE " = final.
      while (true) {
        const idx = buffer.indexOf('\r\n');
        if (idx === -1) break;
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (line.length < 4) continue;
        const isFinal = line[3] === ' ';
        if (!isFinal) continue;

        const code = parseInt(line.slice(0, 3), 10);
        const msg = line.slice(4, 120).toLowerCase();

        if (step === 0) {
          if (code !== 220) return finish('error');
          send('HELO verify.local'); step = 1;
        } else if (step === 1) {
          if (code !== 250) return finish('error');
          send('MAIL FROM:<test@verify.local>'); step = 2;
        } else if (step === 2) {
          if (code !== 250) return finish('error');
          send(`RCPT TO:<${email}>`); step = 3;
        } else if (step === 3) {
          if (code === 250) return finish('valid');
          if (code === 550) {
            if (msg.includes('5.7.1') || msg.includes('blocked') || msg.includes('denied')) {
              return finish('blocked');
            }
            return finish('invalid');
          }
          if (code >= 551 && code <= 554) return finish('invalid');
          return finish('unknown');
        }
      }
    });

    socket.on('timeout', () => finish('error'));
    socket.on('error', () => finish('error'));
    socket.on('close', () => finish('error'));
  });
}

export async function isCatchAll(domain: string, mxHost: string): Promise<'yes' | 'no' | 'blocked'> {
  const fake = `zzzfake${Math.abs(hash(domain)) % 99999}@${domain}`;
  const r = await smtpVerify(fake, mxHost);
  if (r === 'valid') return 'yes';
  if (r === 'blocked') return 'blocked';
  return 'no';
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
