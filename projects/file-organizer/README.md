# Smart File Organizer

A Python tool that automatically organizes files based on content analysis, not just file extensions.

## Features

- **Content-aware categorization**: Analyzes file content to determine the best category
- **Screenshot detection**: Recognizes screenshots by filename patterns
- **Receipt detection**: Uses OCR to identify receipts and invoices in images/PDFs
- **Smart duplicates handling**: Automatically renames conflicting files
- **Dry-run mode**: Preview changes before moving files
- **Watch mode**: Continuously monitor and organize new files
- **Undo support**: History log enables future undo functionality

## Categories

Files are sorted into these categories:
- Documents (PDFs, Word docs, text files)
- Spreadsheets (Excel, CSV)
- Presentations (PowerPoint, Keynote)
- Images (JPG, PNG, GIF, etc.)
- Screenshots (detected by filename patterns)
- Receipts (detected by OCR content)
- Videos, Audio, Archives
- Code (Python, JS, etc.)
- Web files (HTML, CSS)
- Data (JSON, XML, YAML)
- Executables, Fonts, Ebooks
- Miscellaneous (everything else)

## Installation

```bash
# Basic usage (file extension only)
pip install -r requirements.txt

# With OCR support for receipt detection
pip install pytesseract pillow
# Also install tesseract-ocr on your system:
# macOS: brew install tesseract
# Ubuntu: sudo apt-get install tesseract-ocr
```

## Usage

```bash
# Organize Downloads folder (dry run first)
python organizer.py ~/Downloads --dry-run

# Actually organize
python organizer.py ~/Downloads

# Watch mode - auto-organize new files
python organizer.py ~/Downloads --watch

# Check what would happen
python organizer.py ~/Downloads -n
```

## How It Works

1. **Scan**: Enumerates files in the target directory
2. **Analyze**: Extracts content (text from text files, OCR from images)
3. **Categorize**: Determines best category based on:
   - Filename patterns (screenshot detection)
   - File extension
   - MIME type
   - Content analysis (OCR for receipts)
4. **Organize**: Moves files to category subdirectories
5. **Log**: Records actions for potential undo

## Configuration

Edit the `FileCategorizer` class in `organizer.py` to customize:
- Category definitions
- Screenshot detection patterns
- Receipt keyword patterns
- Ignored file patterns

## Future Enhancements

- [ ] Undo functionality using history log
- [ ] Config file for custom rules
- [ ] Local embeddings for semantic search
- [ ] Web dashboard for browsing organized files
- [ ] Integration with cloud storage
