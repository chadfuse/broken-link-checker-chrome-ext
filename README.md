# Broken Link Highlighter 🚨

A fast and efficient Chrome extension that scans webpages for broken links and highlights them in real-time. Built with performance in mind, featuring concurrent checking and smart section detection.

## ✨ Features

### 🔍 **Smart Link Detection**
- **Auto-detection**: Automatically identifies page sections (header, main, footer, sidebar)
- **Semantic HTML5**: Uses modern HTML elements for accurate section detection
- **Concurrent scanning**: Checks up to 12 links simultaneously for maximum speed

### ⚡ **Performance Optimized**
- **HEAD requests**: Uses faster HTTP HEAD requests instead of full GET requests
- **8-second timeout**: Quickly identifies unresponsive links
- **Real-time progress**: Live progress bar with percentage and current URL display

### 🎨 **Modern Dark UI**
- **Compact design**: 280px width popup that doesn't clutter your browser
- **Dark theme**: Easy on the eyes with professional appearance
- **Brand colors**: Consistent #4969f9 blue accent throughout
- **Open Sans font**: Clean, readable typography

### ⚙️ **Customizable Settings**
- **Exclude selectors**: Skip specific areas (e.g., `.admin`, `#comments`)
- **Persistent storage**: Settings are saved automatically
- **Manual override**: Fine-tune which sections to scan

### 📊 **Detailed Results**
- **Comprehensive stats**: Total, working, broken, redirected, and error counts
- **Visual highlighting**: Broken links are highlighted directly on the page
- **Color-coded results**: Green for working, red for broken, orange for redirects

## 🚀 Installation

### From Chrome Web Store (Recommended)
1. Visit the Chrome Web Store (link coming soon)
2. Click "Add to Chrome"
3. Grant necessary permissions
4. Start scanning!

### Manual Installation (Development)
1. Clone this repository:
   ```bash
   git clone https://github.com/chadfuse/broken-link-checker-chrome-ext.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon will appear in your toolbar

## 📖 How to Use

1. **Open the Extension**: Click the extension icon in your Chrome toolbar
2. **Configure Settings** (Optional):
   - Add CSS selectors to exclude in the "Exclude CSS selectors" field
   - Click "Save Settings" to persist your preferences
3. **Start Scanning**: Click the "Scan Links" button
4. **Monitor Progress**: Watch the real-time progress bar and status updates
5. **View Results**: See the summary statistics and highlighted broken links on the page

### Understanding the Results

- 🔵 **Total**: All links found on the page
- 🟢 **Working**: Links that respond correctly (200-299 status codes)
- 🔴 **Broken**: Links that return errors (4xx, 5xx status codes)
- 🟠 **Redirected**: Links that redirect to other URLs
- ⚪ **Errors**: Links that couldn't be checked due to network issues

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Built with the latest Chrome extension standards
- **Service Worker**: Background processing for efficient link checking
- **Content Scripts**: Direct page manipulation for highlighting
- **Storage API**: Persistent user preferences

### Performance Features
- **Concurrent Processing**: 12 parallel link checks
- **HEAD Method**: Faster than full page downloads
- **Smart Timeout**: 8-second limit prevents hanging
- **Memory Efficient**: Minimal resource usage

### Security & Privacy
- **Local Processing**: All scanning happens locally in your browser
- **No Data Collection**: No information is sent to external servers
- **Minimal Permissions**: Only requests necessary permissions
- **Open Source**: Fully transparent codebase

## 🔧 Customization

### Exclude Specific Areas
To prevent scanning certain areas of a webpage, add CSS selectors to the "Exclude CSS selectors" field:

```
.admin, .debug, #comments, .advertisement
```

### Section Detection
The extension automatically detects these page sections:
- **Header**: `<header>`, `<nav>`, `.header`, `#header`
- **Main**: `<main>`, `<article>`, `.main`, `#main`, `.content`
- **Footer**: `<footer>`, `.footer`, `#footer`
- **Sidebar**: `<aside>`, `.sidebar`, `#sidebar`, `.side`

## 🐛 Troubleshooting

### Progress Bar Not Showing
- Ensure the popup is fully loaded before clicking "Scan Links"
- Check browser console for error messages
- Try refreshing the page and rescanning

### Links Not Being Highlighted
- Some websites may block external scripts
- Dynamic content loaded after page load may not be scanned
- Try rescanning after page fully loads

### Performance Issues
- Large pages with many links may take longer to scan
- Network connectivity affects scanning speed
- Consider excluding unnecessary sections to improve speed

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Developer

Created by **Chad Sia** - Chrome extension developer focused on creating useful tools for web developers and content managers.

## 🔗 Links

- **GitHub Repository**: https://github.com/chadfuse/broken-link-checker-chrome-ext
- **Chrome Web Store**: (Coming soon)
- **Report Issues**: https://github.com/chadfuse/broken-link-checker-chrome-ext/issues

---

**Made with ❤️ for the web development community**