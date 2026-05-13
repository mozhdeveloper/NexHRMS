# Biometric Bridge — Google Cloud Turnover Document

> **Last Updated:** May 13, 2026
> **Author:** NexVision Dev Team
> **Purpose:** This document explains how the T800 biometric devices connect to the SorenHRMS application through a bridge server hosted on Google Cloud.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Location 1: T800 ─┐                                                │
│  Location 2: T800 ─┤── plain HTTP ──→ Google Cloud VM ── HTTPS ──→ Vercel API  │
│  Location 3: T800 ─┤                  (fk-bridge.js)               │
│  Location 4: T800 ─┘                  35.231.172.155:8080          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why do we need a bridge?

The T800 biometric device has hardware limitations:
- It can only send data over **plain HTTP** (no HTTPS/TLS support)
- It can only connect to an **IP address + port** (some firmware accepts domain names but fails on HTTPS)
- It cannot send custom headers (like `x-kiosk-api-key`)

Vercel (where our HRMS app is deployed) **requires HTTPS**. So we need a middleman that:
1. Accepts plain HTTP from the T800
2. Translates and forwards the data to Vercel over HTTPS
3. Adds the authentication header (`x-kiosk-api-key`)

That middleman is `fk-bridge.js` running on a Google Cloud VM.

---

## Current Infrastructure

| Component | Details |
|-----------|---------|
| **Bridge Server** | Google Cloud Compute Engine (e2-micro, Always Free) |
| **VM OS** | Ubuntu (Debian-based) |
| **Public IP** | `35.231.172.155` |
| **Bridge Port** | `8080` |
| **Target API** | `https://nex-hrms.vercel.app/api/attendance/t800` |
| **Bridge Script** | `scripts/fk-bridge.js` (Node.js) |
| **Service Name** | `fk-bridge.service` (systemd) |
| **GCP Project** | `premium-outlet-kiosk` (project name in Google Cloud Console) |
| **GCP Region** | us-east1 (free tier eligible) |
| **SSH User** | `marcaedrian67` (Google Cloud OS Login) |

---

## T800 Device Configuration

Each T800 biometric device should be configured with:

| Setting | Value |
|---------|-------|
| **ServerIP** | `35.231.172.155` |
| **ServerPort** | `8080` |

That's all. The device will automatically:
- Send heartbeat polls every ~20 seconds (`receive_cmd`)
- Push attendance scans in real-time (`realtime_glog`) when someone scans their face/finger

---

## How Data Flows (Step by Step)

1. **Employee scans face/finger** on the T800 device
2. T800 sends a `realtime_glog` HTTP POST to `35.231.172.155:8080` containing:
   - `user_id` (biometric ID, e.g., "15")
   - `io_time` (timestamp, e.g., "20260513143000")
   - `dev_id` (device serial number)
3. **fk-bridge.js** receives the request, normalizes the payload, and forwards it to Vercel:
   - Adds `x-kiosk-api-key` header for authentication
   - Converts to JSON format the API expects
4. **Vercel API** (`/api/attendance/t800`) processes the scan:
   - Looks up the employee by `biometric_id` in Supabase
   - First scan of the day → Time IN
   - Second scan of the day → Time OUT
   - Third+ scan → Ignored
5. Response flows back: Vercel → Bridge → T800

---

## File Locations

### On the Google Cloud VM (`35.231.172.155`)

```
/home/marcaedrian67/fk-bridge/
├── fk-bridge.js          # The bridge script (copy of scripts/fk-bridge.js)
├── .env                  # Environment variables
├── package.json          # Node.js dependencies
├── node_modules/         # Installed packages (dotenv)
└── scripts/
    └── fk-bridge.log     # Runtime logs
```

### In the codebase (this repo)

```
scripts/
├── fk-bridge.js          # Source of truth for the bridge script
└── DEPLOY_RENDER.md      # Alternative deployment guide (Render)
```

---

## Environment Variables (on the VM)

File: `/home/marcaedrian67/fk-bridge/.env`

```env
T800_BRIDGE_TARGET_URL=https://nex-hrms.vercel.app/api/attendance/t800
KIOSK_API_KEY=WngyopGtUBDjKal+KsGc8iC9rEH+uS8xCcuf6N9LAcE=
FK_BRIDGE_PORT=8080
```

| Variable | Purpose |
|----------|---------|
| `T800_BRIDGE_TARGET_URL` | Where the bridge forwards attendance scans (your Vercel app) |
| `KIOSK_API_KEY` | Authentication key added to forwarded requests (must match Vercel env) |
| `FK_BRIDGE_PORT` | Port the bridge listens on (T800 connects to this) |

---

## Systemd Service

The bridge runs as a systemd service so it auto-starts on boot and restarts on crash.

**Service file:** `/etc/systemd/system/fk-bridge.service`

```ini
[Unit]
Description=FK Bridge for T800 Biometric
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/marcaedrian67/fk-bridge
ExecStart=/usr/bin/node fk-bridge.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### Common Commands (run via SSH)

```bash
# Check if bridge is running
sudo systemctl status fk-bridge

# View recent logs
sudo journalctl -u fk-bridge -n 50

# Restart the bridge (after updating code or env)
sudo systemctl restart fk-bridge

# Stop the bridge
sudo systemctl stop fk-bridge

# Start the bridge
sudo systemctl start fk-bridge

# View real-time logs (Ctrl+C to exit)
sudo journalctl -u fk-bridge -f
```

---

## How to SSH into the VM

### Option 1: Google Cloud Console (easiest)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Navigate to **Compute Engine → VM Instances**
3. Click the **SSH** button next to the `fk-bridge` instance

### Option 2: Terminal
```bash
gcloud compute ssh marcaedrian67@fk-bridge --zone=us-east1-b
```

---

## How to Update the Bridge Code

1. SSH into the VM
2. Edit the file:
   ```bash
   cd ~/fk-bridge
   nano fk-bridge.js
   ```
3. Paste the updated code from `scripts/fk-bridge.js` in the repo
4. Restart:
   ```bash
   sudo systemctl restart fk-bridge
   sudo systemctl status fk-bridge
   ```

---

## Firewall Rules

A VPC firewall rule named `allow-t800` allows inbound TCP traffic on port 8080 from any IP (`0.0.0.0/0`).

**To verify or edit:**
1. Google Cloud Console → **VPC Network → Firewall**
2. Find `allow-t800`
3. Should show: Ingress, Apply to all, tcp:8080, Allow

---

## Troubleshooting

### Bridge not running
```bash
sudo systemctl status fk-bridge
# If "inactive" or "failed":
sudo systemctl restart fk-bridge
sudo journalctl -u fk-bridge -n 30  # Check error logs
```

### T800 shows red cloud icon (not connecting)
- Verify the T800's ServerIP is `35.231.172.155` and ServerPort is `8080`
- Check if the VM is running in Google Cloud Console
- Test from your laptop: `curl http://35.231.172.155:8080/health`
- If no response, check the firewall rule exists

### Scans show "Unmapped biometric ID"
- The biometric ID on the T800 doesn't match any employee in the HRMS
- Go to HRMS → Employee Management → Edit the employee → set their **Biometric ID** to match the T800 enrollment number

### Forward errors in logs
- The Vercel app might be down or the URL changed
- Check `T800_BRIDGE_TARGET_URL` in the `.env` file
- Test: `curl https://nex-hrms.vercel.app/api/attendance/t800` (should return a response)

### VM ran out of disk space
```bash
df -h                    # Check disk usage
sudo journalctl --vacuum-size=100M  # Clear old logs
```

---

## Adding a New T800 Device

1. On the new T800, go to Network Settings
2. Set **ServerIP:** `35.231.172.155`
3. Set **ServerPort:** `8080`
4. Save and reboot the device
5. Enroll employees on the device (face/finger)
6. In the HRMS, set each employee's **Biometric ID** to match their enrollment number on the T800

No changes needed on the bridge or VM — it handles unlimited devices.

---

## Cost

**$0/month** — The e2-micro VM is part of Google Cloud's Always Free tier. As long as:
- The VM stays in `us-west1`, `us-central1`, or `us-east1`
- It remains an e2-micro instance
- Disk is ≤30GB standard

---

## If You Need to Recreate the VM

1. Create a new e2-micro instance in a free-tier region
2. Install Node.js: `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`
3. Create the app: `mkdir ~/fk-bridge && cd ~/fk-bridge && npm init -y && npm install dotenv`
4. Copy `fk-bridge.js` from the repo's `scripts/` folder
5. Create `.env` with the variables listed above
6. Create the systemd service file (see above)
7. Enable and start: `sudo systemctl enable fk-bridge && sudo systemctl start fk-bridge`
8. Create firewall rule: allow TCP 8080 from 0.0.0.0/0
9. Update T800 devices with the new VM's public IP

---

## Key Contacts / Access

| What | Where |
|------|-------|
| Google Cloud Console | [console.cloud.google.com](https://console.cloud.google.com) |
| GCP Project | `premium-outlet-kiosk` |
| Vercel Dashboard | [vercel.com/dashboard](https://vercel.com/dashboard) |
| Supabase Dashboard | [supabase.com/dashboard](https://supabase.com/dashboard) |
| KIOSK_API_KEY | Stored in Vercel env vars AND the VM's `.env` file (must match) |
