## Phase 1: Boot the Middleware on your Wi-Fi

Since your fk-bridge.js script has a brilliant built-in feature that automatically detects your Wi-Fi IP address, we are going to start the server first to grab those coordinates. We will force it to run on port 8080 to avoid any administrator permission issues.

Connect Both Devices: Ensure your laptop and the T800 biometric device are connected to the exact same Wi-Fi network.

Open your Terminal: Navigate to the root directory of your NexVision HRMS project where your scripts folder is located.

Start the Server: Run the following command based on your operating system:

Mac/Linux: FK_BRIDGE_PORT=8080 node scripts/fk-bridge.js

Windows (PowerShell): $env:FK_BRIDGE_PORT="8080"; node scripts/fk-bridge.js

Windows (CMD): set FK_BRIDGE_PORT=8080 && node scripts/fk-bridge.js

## Phase 2: Grab Your Wi-Fi Coordinates

Once the server starts, look closely at your terminal output. Your script will print out exactly where it lives on the Wi-Fi network.

Look for the line that says: [info] bridge listening {"port":8080...}

Right below it, look for the line that says: [info] local addresses {"addresses":["192.168.x.x"]}

Write down that 192.168.x.x number. This is your laptop's unique address on your Wi-Fi router.

## Phase 3: Route the Biometrics

Now, we tell the T800 to stop looking for Render on the public internet and instead look across your Wi-Fi room to your laptop.

On the T800 device, navigate to the Network settings.

Select ServerIP: Delete the .onrender.com URL and type in the IP address you wrote down in Phase 2.

Select ServerPort: Change this to 8080.

Save the settings and exit to the main screen.

Reboot the T800 (unplug and plug back in, or use the power menu) to force it to initiate a fresh connection over the Wi-Fi.

## Phase 4: The Payload Drop

With the device rebooting, keep your eyes locked on your terminal where fk-bridge.js is running.

Success Looks Like: Within 30 to 60 seconds of the scanner booting up, you should see a payload drop into your terminal logs:
[info] post request received {"path":"/","remote":"...","requestCode":"receive_cmd","devId":"202604210001", ...}

Troubleshooting: If the T800 shows a red cloud icon or nothing appears in the terminal after 2 minutes, your laptop's firewall is blocking the Wi-Fi traffic. Temporarily turn off Windows Defender Firewall or your Mac's Firewall, then restart the T800.
