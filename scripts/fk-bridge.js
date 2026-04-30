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

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }

  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', async () => {
    const buf = Buffer.concat(chunks);
    // Try to parse JSON body or extract JSON block from binary
    let parsed = null;
    try {
      const ctype = req.headers['content-type'] || '';
      if (ctype.includes('application/json')) {
        parsed = JSON.parse(buf.toString('utf8'));
      } else {
        parsed = extractJsonFromBuffer(buf);
      }
    } catch (e) {
      parsed = extractJsonFromBuffer(buf);
    }

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

    const requestCode = parsed.request_code || req.headers['request_code'] || '';
    const isRealtimeLog = requestCode === 'realtime_glog' || parsed.user_id || parsed.userId;

    if (!isRealtimeLog) {
      console.log('[fk-bridge] accepted non-attendance request', { requestCode });
      res.setHeader('response_code', 'OK');
      res.statusCode = 200;
      res.end('OK');
      return;
    }

    // Normalize keys to HRMS-friendly names
    const payload = {
      biometricId: parsed.user_id || parsed.userId || parsed.enroll_id || parsed.pin || parsed.user || null,
      deviceId: parsed.dev_id || parsed.device_id || parsed.deviceId || parsed.dev || null,
      timestampUTC: parsed.io_time || parsed.timestamp || parsed.scanTime || parsed.timestampUTC || null,
      io_mode: parsed.io_mode || parsed.mode || null,
    };

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
