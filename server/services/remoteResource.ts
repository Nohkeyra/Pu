import dns from 'node:dns';
import net from 'node:net';
import https from 'node:https';
import URL from 'node:url';

/** Bounded HTTPS JSON fetch; every socket uses the preflight-validated DNS address. */
export async function fetchPublicJson(value: string): Promise<unknown> {
  const checked = await isSafeUrl(value);
  const { parsedUrl, resolvedAddress } = checked;
  if (!checked.safe || !parsedUrl || !resolvedAddress || parsedUrl.protocol !== 'https:' || parsedUrl.port) {
    throw new Error('OAuth client metadata must use a public HTTPS destination.');
  }
  const hostname = parsedUrl.hostname.toLowerCase();
  const requestPath = `${parsedUrl.pathname}${parsedUrl.search}`;

  return new Promise((resolve, reject) => {
    const request = https.request({
      protocol: 'https:',
      hostname,
      port: 443,
      path: requestPath,
      method: 'GET',
      headers: { accept: 'application/json' },
      lookup: (_hostname, options, callback) => {
        const family = net.isIP(resolvedAddress);
        if (options.all) callback(null, [{ address: resolvedAddress, family }]);
        else callback(null, resolvedAddress, family);
      },
    }, response => {
      const type = String(response.headers['content-type'] || '').split(';')[0].trim();
      if (response.statusCode !== 200 || !(type === 'application/json' || type.endsWith('+json'))) {
        response.destroy();
        reject(new Error('OAuth client metadata must return HTTP 200 JSON without redirects.'));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 64 * 1024) request.destroy(new Error('OAuth client metadata exceeds 64 KiB.'));
        else chunks.push(chunk);
      });
      response.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch { reject(new Error('Invalid OAuth client metadata JSON.')); }
      });
      response.on('error', reject);
      response.on('aborted', () => reject(new Error('OAuth client metadata response aborted.')));
    });
    // A total deadline also bounds slow responses that keep an idle timeout alive.
    const deadline = setTimeout(() => request.destroy(new Error('OAuth client metadata timeout.')), 5000);
    request.on('close', () => clearTimeout(deadline));
    request.on('error', reject);
    request.end();
  });
}

function isPrivateOrReservedIp(ip: string): boolean {
  let cleanIp = ip;
  if (cleanIp.startsWith('::ffff:')) {
    cleanIp = cleanIp.substring(7);
  }

  if (net.isIPv4(cleanIp)) {
    const parts = cleanIp.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return true;
    const [a, b] = parts;

    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a === 192 && b === 0) return true; // Protocol assignments and TEST-NET-1
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmarking
    if (a === 198 && b === 51 && parts[2] === 100) return true; // TEST-NET-2
    if (a === 203 && b === 0 && parts[2] === 113) return true; // TEST-NET-3
    if (a === 192 && b === 88 && parts[2] === 99) return true; // IPv6 relay anycast
    if (a === 255) return true; // broadcast
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a >= 224) return true; // 224.0.0.0/4 Multicast & 240.0.0.0/4 Reserved / Broadcast

    return false;
  }

  if (net.isIPv6(cleanIp)) {
    const lower = cleanIp.toLowerCase();
    if (!/^[23][0-9a-f]{3}:/.test(lower)) return true;
    if (lower.startsWith('2002:')) return true; // Avoid IPv4-embedded 6to4 destinations
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:0' || lower === '0:0:0:0:0:0:0:1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 Unique Local
    if (lower.startsWith('2001:db8:') || lower === '2001:db8::') return true; // documentation range
    if (lower.startsWith('2001:') && /^2001:(?:0|0000):/i.test(lower)) return true; // Teredo/special use
    if (lower.startsWith('64:ff9b:1:')) return true; // local-use IPv4 translation prefix
    if (lower.startsWith('::ffff:')) return true; // reject mapped form unless canonical IPv4 parser handles it
    if (/^fe[89ab]/i.test(lower)) return true; // fe80::/10 Link Local
    return false;
  }

  return true;
}

/**
 * SSRF Security Checker:
 * Validates protocol, hostname, and resolves DNS to ensure target does not map to private/internal IPs.
 */
export async function isSafeUrl(urlStr: string): Promise<{ safe: boolean; parsedUrl?: URL.URL; resolvedAddress?: string }> {
  try {
    const parsed = new URL.URL(urlStr);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) {
      return { safe: false };
    }

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.lan')
    ) {
      return { safe: false };
    }

    let resolvedAddress = hostname;
    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIp(hostname)) return { safe: false };
    } else {
      const lookups = await dns.promises.lookup(hostname, { all: true });
      if (!lookups || lookups.length === 0 || lookups.some(addr => isPrivateOrReservedIp(addr.address))) {
        return { safe: false };
      }
      resolvedAddress = lookups[0].address;
    }

    return { safe: true, parsedUrl: parsed, resolvedAddress };
  } catch {
    return { safe: false };
  }
}

