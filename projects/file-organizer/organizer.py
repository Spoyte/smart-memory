#!/usr/bin/env python3
"""
Smart File Organizer

Watches a directory and automatically organizes files based on content analysis.
Uses file type detection, content extraction, and (optionally) local embeddings
to categorize files intelligently.

Usage:
    python organizer.py --watch ~/Downloads
    python organizer.py --once ~/Downloads  # One-time organization
"""

import os
import sys
import json
import shutil
import argparse
import mimetypes
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Callable
from dataclasses import dataclass, asdict
from fnmatch import fnmatch
import hashlib

# Content extraction
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False


@dataclass
class FileInfo:
    """Information about a file to be organized."""
    path: Path
    size: int
    mime_type: str
    extension: str
    created: datetime
    modified: datetime
    content_hash: str
    extracted_text: Optional[str] = None
    category: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            'path': str(self.path),
            'size': self.size,
            'mime_type': self.mime_type,
            'extension': self.extension,
            'created': self.created.isoformat(),
            'modified': self.modified.isoformat(),
            'content_hash': self.content_hash,
            'category': self.category,
        }


class ContentExtractor:
    """Extracts meaningful content from various file types."""
    
    def __init__(self):
        self.extractors: Dict[str, Callable[[Path], Optional[str]]] = {
            'text/plain': self._extract_text,
            'text/markdown': self._extract_text,
            'text/html': self._extract_text,
            'text/css': self._extract_text,
            'text/javascript': self._extract_text,
            'application/json': self._extract_text,
            'application/xml': self._extract_text,
            'image/png': self._extract_image_text,
            'image/jpeg': self._extract_image_text,
            'image/webp': self._extract_image_text,
            'image/gif': self._extract_image_text,
            'application/pdf': self._extract_pdf_text,
        }
    
    def extract(self, path: Path, mime_type: str) -> Optional[str]:
        """Extract text content from a file."""
        # Try specific extractor
        if mime_type in self.extractors:
            return self.extractors[mime_type](path)
        
        # Try by extension for text files
        ext = path.suffix.lower()
        text_extensions = {'.txt', '.md', '.json', '.xml', '.yaml', '.yml', 
                          '.csv', '.log', '.py', '.js', '.html', '.css', 
                          '.sh', '.bash', '.zsh', '.conf', '.cfg', '.ini'}
        if ext in text_extensions:
            return self._extract_text(path)
        
        return None
    
    def _extract_text(self, path: Path) -> Optional[str]:
        """Extract text from a text file."""
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()[:5000]  # First 5000 chars
        except Exception:
            return None
    
    def _extract_image_text(self, path: Path) -> Optional[str]:
        """Extract text from image using OCR."""
        if not HAS_PIL or not HAS_TESSERACT:
            return None
        try:
            image = Image.open(path)
            return pytesseract.image_to_string(image)[:2000]
        except Exception:
            return None
    
    def _extract_pdf_text(self, path: Path) -> Optional[str]:
        """Extract text from PDF."""
        # Basic PDF text extraction without external deps
        try:
            with open(path, 'rb') as f:
                content = f.read()
                # Look for text streams in PDF
                text = b''
                in_text = False
                for i in range(len(content) - 5):
                    if content[i:i+5] == b'BT\n\n':  # Begin text
                        in_text = True
                    elif content[i:i+4] == b'ET\n':  # End text
                        in_text = False
                    elif in_text and content[i:i+2] == b'(':
                        # Extract text between parentheses
                        end = content.find(b')', i)
                        if end > i:
                            text += content[i+1:end] + b' '
                
                # Also try to find raw text
                decoded = content.decode('latin-1', errors='ignore')
                # Look for common PDF text patterns
                import re
                text_parts = re.findall(r'\(([^\)]+)\)', decoded)
                if text_parts:
                    return ' '.join(text_parts)[:5000]
                return text.decode('latin-1', errors='ignore')[:5000] if text else None
        except Exception:
            return None


class FileCategorizer:
    """Categorizes files based on content and metadata."""
    
    CATEGORIES = {
        'Documents': ['.pdf', '.doc', '.docx', '.odt', '.rtf', '.tex'],
        'Spreadsheets': ['.xls', '.xlsx', '.ods', '.csv', '.tsv'],
        'Presentations': ['.ppt', '.pptx', '.odp', '.key'],
        'Images': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'],
        'Screenshots': [],  # Detected by content/naming
        'Videos': ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv'],
        'Audio': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
        'Archives': ['.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz'],
        'Code': ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb', '.php'],
        'Web': ['.html', '.htm', '.css', '.scss', '.sass', '.less'],
        'Data': ['.json', '.xml', '.yaml', '.yml', '.sql', '.db'],
        'Executables': ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.appimage'],
        'Fonts': ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
        'Ebooks': ['.epub', '.mobi', '.azw', '.azw3'],
    }
    
    SCREENSHOT_PATTERNS = ['screenshot', 'screen shot', 'screencapture', 'capture', 
                          'img_', 'image_', 'photo_', 'pic_', 'screen']
    
    RECEIPT_PATTERNS = ['receipt', 'invoice', 'bill', 'payment', 'order', 'purchase',
                       'transaction', 'total', 'tax', 'subtotal', 'amount due']
    
    def __init__(self):
        self.extractor = ContentExtractor()
    
    def categorize(self, file_info: FileInfo) -> str:
        """Determine the category for a file."""
        path = file_info.path
        ext = file_info.extension.lower()
        name_lower = path.name.lower()
        
        # Check for screenshots by name pattern
        if any(pattern in name_lower for pattern in self.SCREENSHOT_PATTERNS):
            return 'Screenshots'
        
        # Check if it's an image that might be a receipt
        if ext in self.CATEGORIES['Images']:
            text = file_info.extracted_text or ''
            text_lower = text.lower()
            if any(pattern in text_lower for pattern in self.RECEIPT_PATTERNS):
                return 'Receipts'
        
        # Check by extension
        for category, extensions in self.CATEGORIES.items():
            if ext in extensions:
                return category
        
        # Check by MIME type
        mime = file_info.mime_type
        if mime:
            if mime.startswith('image/'):
                return 'Images'
            elif mime.startswith('video/'):
                return 'Videos'
            elif mime.startswith('audio/'):
                return 'Audio'
            elif mime == 'application/pdf':
                # Check if PDF is a receipt
                text = file_info.extracted_text or ''
                if any(pattern in text.lower() for pattern in self.RECEIPT_PATTERNS):
                    return 'Receipts'
                return 'Documents'
            elif mime.startswith('text/'):
                # Check if it's code
                if ext in ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rs']:
                    return 'Code'
                return 'Documents'
        
        # Default fallback
        return 'Miscellaneous'


class FileOrganizer:
    """Main organizer class that watches and organizes files."""
    
    def __init__(self, source_dir: Path, dry_run: bool = False):
        self.source_dir = Path(source_dir).expanduser().resolve()
        self.dry_run = dry_run
        self.categorizer = FileCategorizer()
        self.log_file = self.source_dir / '.organizer.log.json'
        self.ignored_patterns = [
            '.organizer.log.json',
            '.DS_Store',
            'Thumbs.db',
            '.localized',
            '.git',
            '.gitignore',
            '.env',
            '.venv',
            'node_modules',
            '__pycache__',
            '*.tmp',
            '*.temp',
            '*.part',
            '*.crdownload',
        ]
        self.history: List[dict] = self._load_history()
    
    def _load_history(self) -> List[dict]:
        """Load organization history."""
        if self.log_file.exists():
            try:
                with open(self.log_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        return []
    
    def _save_history(self):
        """Save organization history."""
        try:
            with open(self.log_file, 'w') as f:
                json.dump(self.history[-100:], f, indent=2)  # Keep last 100
        except Exception as e:
            print(f"Warning: Could not save history: {e}")
    
    def _should_ignore(self, path: Path) -> bool:
        """Check if file should be ignored."""
        name = path.name
        for pattern in self.ignored_patterns:
            if fnmatch(name, pattern):
                return True
        # Ignore hidden files by default
        if name.startswith('.') and name != '.organizer.log.json':
            return True
        return False
    
    def _compute_hash(self, path: Path) -> str:
        """Compute a quick hash of file content."""
        try:
            hasher = hashlib.blake2b(digest_size=16)
            with open(path, 'rb') as f:
                # Read first and last 8KB for speed
                hasher.update(f.read(8192))
                f.seek(-8192, 2)
                hasher.update(f.read(8192))
            return hasher.hexdigest()
        except Exception:
            return hashlib.blake2b(path.name.encode()).hexdigest()[:16]
    
    def _analyze_file(self, path: Path) -> FileInfo:
        """Analyze a file and extract information."""
        stat = path.stat()
        mime_type, _ = mimetypes.guess_type(str(path))
        
        info = FileInfo(
            path=path,
            size=stat.st_size,
            mime_type=mime_type or 'application/octet-stream',
            extension=path.suffix,
            created=datetime.fromtimestamp(stat.st_ctime),
            modified=datetime.fromtimestamp(stat.st_mtime),
            content_hash=self._compute_hash(path),
        )
        
        # Extract content for analysis
        info.extracted_text = self.categorizer.extractor.extract(path, info.mime_type)
        
        # Determine category
        info.category = self.categorizer.categorize(info)
        
        return info
    
    def _get_destination(self, file_info: FileInfo) -> Path:
        """Get the destination path for a file."""
        category = file_info.category or 'Miscellaneous'
        dest_dir = self.source_dir / category
        
        # Handle duplicates
        dest_path = dest_dir / file_info.path.name
        counter = 1
        stem = file_info.path.stem
        suffix = file_info.path.suffix
        
        while dest_path.exists():
            dest_path = dest_dir / f"{stem}_{counter:03d}{suffix}"
            counter += 1
        
        return dest_path
    
    def organize_file(self, path: Path) -> Optional[dict]:
        """Organize a single file."""
        if not path.exists():
            return None
        
        if self._should_ignore(path):
            return None
        
        # Analyze the file
        file_info = self._analyze_file(path)
        
        # Skip if already in correct category folder
        current_parent = path.parent.name
        if current_parent == file_info.category:
            return None
        
        # Get destination
        dest_path = self._get_destination(file_info)
        
        # Create category directory
        if not self.dry_run:
            dest_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Move the file
        action = 'moved'
        if self.dry_run:
            print(f"[DRY RUN] Would move: {path.name} -> {file_info.category}/")
        else:
            try:
                shutil.move(str(path), str(dest_path))
                print(f"Moved: {path.name} -> {file_info.category}/")
            except Exception as e:
                print(f"Error moving {path.name}: {e}")
                return None
        
        # Log the action
        record = {
            'timestamp': datetime.now().isoformat(),
            'action': action,
            'source': str(path),
            'destination': str(dest_path),
            'category': file_info.category,
            'file_info': file_info.to_dict(),
            'dry_run': self.dry_run,
        }
        
        if not self.dry_run:
            self.history.append(record)
            self._save_history()
        
        return record
    
    def organize_all(self) -> List[dict]:
        """Organize all files in the source directory."""
        results = []
        
        if not self.source_dir.exists():
            print(f"Error: Directory does not exist: {self.source_dir}")
            return results
        
        print(f"Organizing: {self.source_dir}")
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE'}")
        print("-" * 50)
        
        # Get all files (not in category subdirectories)
        files = []
        for item in self.source_dir.iterdir():
            if item.is_file() and not self._should_ignore(item):
                files.append(item)
        
        if not files:
            print("No files to organize.")
            return results
        
        print(f"Found {len(files)} files to process...\n")
        
        for file_path in files:
            result = self.organize_file(file_path)
            if result:
                results.append(result)
        
        print(f"\n{'-' * 50}")
        print(f"Organized {len(results)} files")
        
        # Print summary
        categories = {}
        for r in results:
            cat = r['category']
            categories[cat] = categories.get(cat, 0) + 1
        
        if categories:
            print("\nSummary by category:")
            for cat, count in sorted(categories.items()):
                print(f"  {cat}: {count}")
        
        return results
    
    def watch(self):
        """Watch directory for changes and organize new files."""
        try:
            from watchdog.observers import Observer
            from watchdog.events import FileSystemEventHandler
        except ImportError:
            print("Watch mode requires 'watchdog' package.")
            print("Install with: pip install watchdog")
            return
        
        class OrganizerHandler(FileSystemEventHandler):
            def __init__(self, organizer):
                self.organizer = organizer
                self.processed = set()
            
            def on_created(self, event):
                if event.is_directory:
                    return
                # Debounce: wait a moment for file to be fully written
                import time
                time.sleep(0.5)
                self.organizer.organize_file(Path(event.src_path))
            
            def on_modified(self, event):
                if event.is_directory:
                    return
                # Only process if it's a new file in root
                path = Path(event.src_path)
                if path.parent == self.organizer.source_dir:
                    import time
                    time.sleep(0.5)
                    self.organizer.organize_file(path)
        
        print(f"Watching: {self.source_dir}")
        print("Press Ctrl+C to stop\n")
        
        event_handler = OrganizerHandler(self)
        observer = Observer()
        observer.schedule(event_handler, str(self.source_dir), recursive=False)
        observer.start()
        
        try:
            while True:
                import time
                time.sleep(1)
        except KeyboardInterrupt:
            observer.stop()
            print("\nStopped watching.")
        
        observer.join()


def main():
    parser = argparse.ArgumentParser(
        description='Smart File Organizer - Automatically organizes files by content'
    )
    parser.add_argument('directory', help='Directory to organize')
    parser.add_argument('--dry-run', '-n', action='store_true',
                       help='Show what would be done without moving files')
    parser.add_argument('--watch', '-w', action='store_true',
                       help='Watch directory for new files')
    parser.add_argument('--undo', action='store_true',
                       help='Undo last organization (restore files to root)')
    
    args = parser.parse_args()
    
    organizer = FileOrganizer(args.directory, dry_run=args.dry_run)
    
    if args.undo:
        print("Undo functionality not yet implemented.")
        # TODO: Implement undo using history log
    elif args.watch:
        organizer.watch()
    else:
        organizer.organize_all()


if __name__ == '__main__':
    main()
