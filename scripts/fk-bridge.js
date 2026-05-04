#!/usr/bin/env node
// Simple FKWeb -> HRMS bridge
// Listens on port 8088 and forwards scanner JSON payloads to local Next.js API

const http = require('http');
const { URL } = require('url');

const LISTEN_PORT = process.env.FK_BRIDGE_PORT ? Number(process.env.FK_BRIDGE_PORT) : 8088;
const TARGET = process.env.HRMS_URL || 'http://localhost:3000/api/attendance/biometric-scan';
const KIOSK_API_KEY = process.env.KIOSK_API_KEY || '';

function extractJsonFromBuffer(buf) {
  try {
    const s = buf.toString('utf8');
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const part = s.slice(start, end + 1);
      return JSON.parse(part);
    }
  } catch (e) {
    // ignore
  }
  return null;
}

function parseBody(buf, contentType) {
  const text = buf.toString('utf8');

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return extractJsonFromBuffer(buf);
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = new URLSearchParams(text);
    return Object.fromEntries(form.entries());
  }

  return extractJsonFromBuffer(buf);
}

function decodeBlockJson(parsed) {
  if (!parsed || typeof parsed.block !== 'string') return null;

  try {
    const blockBuf = Buffer.from(parsed.block, 'base64');
    return extractJsonFromBuffer(blockBuf);
  } catch (e) {
    return null;
  }
}

function firstValue(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return null;
}

function normalizeRequestCode(value) {
  return String(value || '').trim().toLowerCase();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      bridge: 'fk-bridge',
      listeningPort: LISTEN_PORT,
      target: TARGET,
    }));
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const buf = Buffer.concat(chunks);
    const ctype = String(req.headers['content-type'] || '').toLowerCase();
    let parsed = parseBody(buf, ctype);

    if (!parsed) {
      console.log('[fk-bridge] accepted non-log/partial request', {
        requestCode: req.headers['request_code'],
        devId: req.headers['dev_id'],
        blkNo: req.headers['blk_no'],
        bytes: buf.length,
      });
      res.setHeader('response_code', 'OK');
      res.statusCode = 200;
      res.end('OK');
      return;
    }

    const blockJson = decodeBlockJson(parsed);
    if (blockJson) {
      parsed = { ...parsed, ...blockJson };
    }

    const requestCode = normalizeRequestCode(parsed.request_code || req.headers['request_code']);
    const biometricId = firstValue(
      parsed.biometricId,
      parsed.user_id,
      parsed.userId,
      parsed.enroll_id,
      parsed.enrollId,
      parsed.pin,
      parsed.user,
      parsed.uid,
      parsed.id
    );
    const isRealtimeLog = requestCode === 'realtime_glog' || Boolean(biometricId);

    if (!isRealtimeLog) {
      console.log('[fk-bridge] accepted non-attendance request', { requestCode });
      res.setHeader('response_code', 'OK');
      res.statusCode = 200;
      res.end('OK');
      return;
    }

    // Normalize keys to HRMS-friendly names
    const payload = {
      biometricId,
      deviceId: firstValue(parsed.dev_id, parsed.device_id, parsed.deviceId, parsed.dev, req.headers['dev_id']),
      timestampUTC: firstValue(parsed.io_time, parsed.timestamp, parsed.scanTime, parsed.timestampUTC, parsed.time),
      io_mode: firstValue(parsed.io_mode, parsed.mode),
    };

    if (!payload.biometricId) {
      console.warn('[fk-bridge] realtime log missing biometric ID', {
        requestCode,
        devId: payload.deviceId,
        keys: Object.keys(parsed),
      });
    }

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (KIOSK_API_KEY) headers['x-kiosk-api-key'] = KIOSK_API_KEY;
      const fetchRes = await fetch(TARGET, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const text = await fetchRes.text();
      console.log('[fk-bridge] forwarded', payload, '->', fetchRes.status, text);
    } catch (err) {
      console.error('[fk-bridge] forward error', err);
    }

    // Respond in a simple text OK so device thinks server accepted
    res.setHeader('response_code', 'OK');
    res.setHeader('trans_id', 'BRIDGE');
    res.setHeader('cmd_code', 'REALTIME_GLOG');
    res.statusCode = 200;
    res.end('OK');
  });
});

server.listen(LISTEN_PORT, () => {
  console.log(`[fk-bridge] listening on port ${LISTEN_PORT} -> forwarding to ${TARGET}`);
});

// allow running with node scripts/fk-bridge.js
