# AI Screen Assistant

A cross-platform desktop application that automatically captures screenshots and analyzes them using OpenAI's Vision API. Get real-time AI assistance based on what's on your screen.

![Platform Support](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Automatic Screen Capture**: Configurable interval (5-60 seconds)
- **AI-Powered Analysis**: Uses OpenAI GPT-4 Vision for intelligent screen analysis
- **"Help Me Now" Button**: Instant capture and analysis when you need it
- **System Tray Integration**: Runs quietly in the background
- **Cross-Platform**: Works on Windows and macOS
- **Privacy-Focused**: All processing done through your own API key
- **Comprehensive Logging**: Debug and track application activity

## 📁 Project Structure

```
ai-screen-assistant/
├── main/                    # Main process (Node.js)
│   ├── main.js             # Application entry point
│   ├── preload.js          # Secure bridge to renderer
│   ├── screenshot.js       # Screen capture module
│   ├── api.js              # OpenAI API integration
│   ├── tray.js             # System tray management
│   └── logger.js           # Logging utilities
├── renderer/               # Renderer process (UI)
│   ├── index.html          # Main HTML
│   ├── style.css           # Styles
│   └── app.js              # UI logic
├── assets/                 # Icons and images
│   ├── icon.png           
│   ├── icon.ico            # Windows icon
│   ├── icon.icns           # macOS icon
│   └── tray-icon.png       # Tray icon
├── entitlements.mac.plist  # macOS entitlements
├── package.json            # Dependencies & scripts
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- **OpenAI API Key** with GPT-4 Vision access

### Installation

1. **Clone or download this project**

```bash
cd ai-screen-assistant
```

2. **Install dependencies**

```bash
npm install
```

3. **Create icon assets** (optional but recommended)

Place your icons in the `assets/` folder:
- `icon.png` (512x512 for general use)
- `icon.ico` (Windows)
- `icon.icns` (macOS)
- `tray-icon.png` (16x16 or 22x22 for system tray)
- `tray-iconTemplate.png` (macOS menu bar, use Template suffix)

4. **Run the application**

```bash
npm start
```

5. **Configure your API key**

- Click the Settings icon (⚙️) in the app
- Enter your OpenAI API key
- Save settings

## 🔧 Configuration

### Settings Panel

Access settings by clicking the gear icon:

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | Your OpenAI API key | Required |
| Capture Interval | Time between auto-captures | 10 seconds |
| Show Notifications | Desktop notifications on analysis | Enabled |
| Minimize to Tray | Keep running when window closed | Enabled |

### Environment Variables (Optional)

You can also set defaults via environment:

```bash
export OPENAI_API_KEY=sk-your-key-here
```

## 🏗️ Building for Distribution

### Windows Installer (.exe)

```bash
npm run build:win
```

Outputs:
- `dist/AI Screen Assistant Setup.exe` - NSIS installer
- `dist/AI Screen Assistant.exe` - Portable version

### macOS Installer (.dmg)

```bash
npm run build:mac
```

Outputs:
- `dist/AI Screen Assistant.dmg` - DMG installer
- `dist/AI Screen Assistant.app` - Application bundle

### Build for Both Platforms

```bash
npm run build:all
```

> **Note**: You can only build macOS apps on macOS. Windows builds can be created on any platform.

## 🔐 Screen Capture Permissions

### macOS

On macOS Catalina (10.15) and later, screen capture requires explicit user permission:

1. When you first run the app, it will prompt for permission
2. Go to **System Preferences** → **Security & Privacy** → **Privacy** → **Screen Recording**
3. Enable the checkbox for "AI Screen Assistant"
4. Restart the app if necessary

The app includes proper entitlements for:
- Screen Recording access
- Network access for API calls
- Hardened runtime compatibility

### Windows

Windows does not require explicit permission for screen capture. The app works out of the box.

## 🔌 API Integration

### OpenAI Vision API

The app uses OpenAI's GPT-4 Vision model (`gpt-4o`) for analysis. Each capture:

1. Takes a PNG screenshot
2. Converts to base64
3. Sends to OpenAI API with analysis prompt
4. Displays the response in the UI

### Custom Prompts

You can modify the analysis prompt in `main/api.js`:

```javascript
const systemPrompt = `You are an AI assistant analyzing the user's screen...`;
const userPrompt = `Analyze this screenshot and provide helpful insights...`;
```

### Using Other AI Providers

To use a different AI provider, modify `main/api.js`:

```javascript
// Example: Using Anthropic Claude
const API_URL = 'https://api.anthropic.com/v1/messages';
// Update headers and request format accordingly
```

## 🛠️ Development

### Debug Mode

Run with DevTools enabled:

```bash
npm start -- --debug
```

### Logs Location

Logs are stored in the user data directory:

- **Windows**: `%APPDATA%/ai-screen-assistant/logs/`
- **macOS**: `~/Library/Application Support/ai-screen-assistant/logs/`

Files:
- `app.log` - All application logs
- `error.log` - Errors only

### Modifying the UI

The renderer process uses vanilla HTML/CSS/JS:

1. Edit `renderer/index.html` for structure
2. Edit `renderer/style.css` for styling
3. Edit `renderer/app.js` for behavior

Changes take effect after restart (or use Ctrl+R to reload).

## 🐛 Troubleshooting

### Common Issues

**"Screenshot permission denied" (macOS)**
- Check System Preferences → Security & Privacy → Screen Recording
- Restart the app after granting permission

**"API key not configured"**
- Open Settings and enter your OpenAI API key
- Ensure the key has GPT-4 Vision access

**"Network error"**
- Check your internet connection
- Verify firewall isn't blocking the app

**"Rate limit exceeded"**
- Wait a few minutes and try again
- Consider increasing capture interval

### Debug Steps

1. Check the logs in the logs directory
2. Open DevTools (Ctrl+Shift+I / Cmd+Option+I)
3. Check the console for errors
4. Ensure your API key is valid at [platform.openai.com](https://platform.openai.com)

## 📊 Resource Usage

Typical resource consumption:
- **Memory**: ~100-150 MB
- **CPU**: Minimal when idle, brief spike during capture
- **Network**: ~500KB-1MB per analysis (depends on screen size)
- **Disk**: ~10MB for logs (auto-rotated)

## 🔒 Security Considerations

- API keys are stored locally using `electron-store` (encrypted)
- Screenshots are never saved to disk (memory only)
- All network traffic uses HTTPS
- Context isolation enabled for renderer process
- No external scripts or resources loaded

## 📄 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Check existing issues for solutions
- Review the troubleshooting section

---

**Made with ❤️ using Electron.js**
