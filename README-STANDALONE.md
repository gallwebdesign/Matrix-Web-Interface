# 8x8 Video Matrix Controller - Standalone Package

A ready-to-run web interface for controlling your 8x8 seamless video matrix switcher.

## 🚀 Quick Start (No Installation Required!)

### Windows Users:
1. Double-click **`START.bat`**
2. The browser will open automatically
3. That's it! 

### Mac/Linux Users:
1. Double-click **`START.sh`** (or run it from terminal)
2. The browser will open automatically
3. That's it!

## 📦 What's Included

- **START.bat** - Windows launcher (double-click to run)
- **START.sh** - Mac/Linux launcher (double-click to run)
- **server.js** - Backend server
- **server-autostart.js** - Auto-launching server (used by launchers)
- **public/** - Web interface files
- **package.json** - Node.js configuration

## ⚙️ Configuration

Before first use, you need to set your video matrix IP address:

1. Open **`server.js`** (or `server-autostart.js`) in a text editor
2. Find line 14:
   ```javascript
   const MATRIX_IP = '192.168.10.254'; // Change this to your matrix IP
   ```
3. Change the IP address to match your video matrix
4. Save the file

## 🎯 First Time Setup

### Prerequisites
You need Node.js installed on your computer.

**Windows:**
1. Download from: https://nodejs.org/
2. Install the LTS version
3. Restart your computer

**Mac:**
```bash
brew install node
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install nodejs npm
```

### Install Dependencies
Open a terminal/command prompt in this folder and run:
```bash
npm install
```

You only need to do this once!

## 💻 Usage

### Method 1: Auto-Start Launchers (Recommended)

**Windows:**
- Double-click **`START.bat`**
- Server starts and browser opens automatically
- Press Ctrl+C in the terminal to stop

**Mac/Linux:**
- Double-click **`START.sh`** (you may need to mark it as executable first)
- Or from terminal: `./START.sh`
- Server starts and browser opens automatically
- Press Ctrl+C to stop

### Method 2: Manual Start

Open terminal in this folder and run:
```bash
npm start
```

Then open your browser to: http://localhost:3000

## 🔧 Advanced: Create Desktop Shortcut

### Windows:
1. Right-click on **`START.bat`**
2. Click "Create shortcut"
3. Drag the shortcut to your Desktop
4. (Optional) Right-click shortcut → Properties → Change Icon

### Mac:
1. Open Automator
2. Create new "Application"
3. Add "Run Shell Script" action
4. Paste: `cd /path/to/folder && ./START.sh`
5. Save as "Video Matrix Controller.app"
6. Move to Applications folder

### Linux:
Create a `.desktop` file:
```bash
nano ~/.local/share/applications/video-matrix.desktop
```

Add:
```ini
[Desktop Entry]
Type=Application
Name=Video Matrix Controller
Exec=/path/to/folder/START.sh
Icon=video
Terminal=true
Categories=Utility;
```

## 🌟 Features

- **Visual 8x8 Matrix Grid** - Click any cell to route inputs to outputs
- **Auto-Start** - Opens browser automatically
- **Real-time Status** - Shows current routing from matrix
- **Quick Actions**:
  - Turn all outputs OFF
  - Diagonal routing (1→1, 2→2, etc.)
  - Route all outputs to Input 1
- **Activity Log** - Track all operations
- **Auto-Reconnect** - Attempts to reconnect if connection lost

## 🔌 Network Configuration

The application uses:
- **Port 3000** for the web server
- **Port 23** for telnet to the video matrix

Make sure these ports are not blocked by firewall.

## 🆘 Troubleshooting

### Browser doesn't open automatically
- Manually open: http://localhost:3000

### "Cannot connect to matrix"
- Check the matrix IP address in `server.js`
- Ensure your computer is on the same network
- Verify the matrix is powered on
- Try pinging the matrix: `ping 192.168.10.254`

### "Port 3000 already in use"
- Another instance may be running
- Close all terminal windows and try again
- Or change the port in `server.js` (line 11)

### Mac: "Permission denied" when running START.sh
```bash
chmod +x START.sh
```

### Dependencies not installed
Make sure you've run:
```bash
npm install
```

## 🔄 Auto-Start on System Boot (Optional)

### Windows:
1. Press `Win+R`, type `shell:startup`, press Enter
2. Copy the shortcut to **`START.bat`** into this folder
3. The app will start when Windows starts

### Mac (launchd):
Create file: `~/Library/LaunchAgents/com.videomatrix.controller.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.videomatrix.controller</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/folder/START.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.videomatrix.controller.plist
```

### Linux (systemd):
Create file: `/etc/systemd/system/video-matrix.service`
```ini
[Unit]
Description=Video Matrix Controller
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/folder
ExecStart=/usr/bin/node /path/to/folder/server-autostart.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable video-matrix.service
sudo systemctl start video-matrix.service
```

## 📝 API Commands

The system uses these commands:
- **Switch**: `SET SW in<X> out<Y>` - Route input to output
- **Turn Off**: `SET SW in0 out<Y>` - Turn off an output
- **Query Status**: `GET MP all` - Get all current mappings

## 🆕 Updates

To update the application:
1. Download the new version
2. Replace the old files
3. Keep your `MATRIX_IP` setting

## 📄 License

MIT License - Free to use and modify

## 💡 Tips

- Keep the terminal window open while using the app
- Bookmark http://localhost:3000 in your browser
- You can access from other computers on your network using your computer's IP: `http://<your-ip>:3000`

---

**Need Help?** Check the activity log in the web interface for error messages.
