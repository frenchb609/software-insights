# PDF Viewer - Vanilla JavaScript (Frontend Only)

A lightweight, frontend-only PDF viewer built with vanilla JavaScript. No backend server required!

## Features

✨ **Features:**

- 📁 **Upload PDFs** - Select PDF files directly from your computer
- 🔍 **View PDFs** - Display PDFs with high-quality rendering using PDF.js
- ➡️ **Navigate Pages** - Previous/Next buttons and page jump input
- 🔎 **Zoom** - Zoom in/out with reset button
- 📱 **Responsive** - Works on desktop and tablet
- 🎨 **Modern UI** - Clean design with smooth interactions
- ⚡ **No Backend** - Pure frontend solution, works everywhere!

## Project Structure

```
it-information/
├── index.html           # Main HTML file
├── styles.css          # Styling
├── script.js           # Frontend JavaScript
└── README.md           # This file
```

## Setup Instructions

### Option 1: Simple File Open (Easiest)

Simply open `index.html` directly in your browser:

1. Right-click on `index.html`
2. Select "Open with" and choose your browser
3. Click "📁 Add PDFs" to select PDF files
4. That's it!

### Option 2: Local Server (Recommended for better functionality)

If you want to run it with a local server:

#### Using Python 3:

```bash
cd c:\Users\dell\Desktop\it-information
python -m http.server 8000
```

Then open `http://localhost:8000`

#### Using Python 2:

```bash
python -m SimpleHTTPServer 8000
```

#### Using Node.js (if you have it):

```bash
npx http-server
```

#### Using PHP:

```bash
php -S localhost:8000
```

## Usage

1. **Add PDFs**: Click the "📁 Add PDFs" button to select PDF files from your computer
2. **View PDFs**: Click on any PDF name in the sidebar to open it
3. **Navigate Pages**:
   - Use "← Previous" and "Next →" buttons
   - Type a page number and press Enter to jump to that page
4. **Zoom**:
   - Click "🔍+" to zoom in
   - Click "🔍-" to zoom out
   - Click "Reset" to return to default zoom level

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **PDF Rendering**: [PDF.js](https://mozilla.github.io/pdf.js/) (via CDN)
- **Styling**: Modern CSS with CSS variables for theming
- **No Backend**: Completely client-side

## Browser Compatibility

Works in all modern browsers that support:

- ES6 JavaScript
- HTML5 Canvas
- File API
- Fetch API

Tested on:

- Chrome/Chromium
- Firefox
- Safari
- Edge

## How It Works

1. User selects PDF files using the file input dialog
2. Files are stored in browser memory (state management)
3. Files are read as ArrayBuffers
4. PDF.js library renders PDF pages to HTML5 Canvas
5. All processing happens on the client-side

## Limitations & Notes

- **Files stay in memory**: PDFs are stored in browser memory while using the application. Refresh the page to clear.
- **File size**: Very large PDFs may use significant memory
- **No persistence**: PDFs are not saved between browser sessions (intentional for privacy)
- **Security**: All files are processed locally; nothing is sent to any server

## Customization

### Change Colors

Edit `styles.css` and modify CSS variables:

```css
:root {
  --primary-color: #2c3e50;
  --secondary-color: #3498db;
  --accent-color: #e74c3c;
  /* ... more variables */
}
```

### Adjust Default Zoom

In `script.js`, change the scale factor in `renderPage`:

```javascript
const scale = 1.5 * state.zoom; // Change 1.5 to your preference
```

## Troubleshooting

### PDFs won't open

- Check browser console (F12) for error messages
- Ensure your PDF files are valid
- Try a different PDF file to confirm it's not corrupted

### Zoom not working properly

- This is normal for some PDFs with unusual dimensions
- Try zooming from 100% (Reset button)

### Button disabled after page jump

- Enter a page number between 1 and the total pages

### File upload not working

- Check browser permissions for file access
- Try using a different browser

## FAQ

**Q: Can I add PDFs permanently?**
A: No, PDFs are stored in memory. Refresh to clear them. This is intentional for privacy.

**Q: How large can PDFs be?**
A: Depends on your browser and RAM. Typically works well with PDFs up to 100MB+.

**Q: Do you collect my PDFs?**
A: No. Everything runs locally in your browser. Nothing is uploaded anywhere.

**Q: Can I use this offline?**
A: Yes! Just use Option 1 (open HTML directly). The PDF.js library loads from CDN, so you need internet the first time. To work fully offline, download PDF.js.

## License

MIT
