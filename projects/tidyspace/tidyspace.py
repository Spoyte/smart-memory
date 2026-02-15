#!/usr/bin/env python3
"""
TidySpace - Automated Workspace Cleanup

Intelligently organizes messy folders (Downloads, Desktop, etc.) by:
- Categorizing files by type and date
- Moving old files to archives
- Removing obvious junk (duplicate downloads, old installers)
- Generating reports of what was moved/cleaned

Usage:
    python tidyspace.py [--dry-run] [--config path/to/config.yaml]
"""

import os
import sys
import shutil
import argparse
import json
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Optional
import re


# Default configuration
DEFAULT_CONFIG = {
    "targets": [
        {
            "path": "~/Downloads",
            "rules": [
                {"pattern": "*.pdf", "dest": "~/Documents/PDFs", "max_age_days": 90},
                {"pattern": "*.{jpg,jpeg,png,gif,webp}", "dest": "~/Pictures/Downloads", "max_age_days": 30},
                {"pattern": "*.{zip,tar.gz,rar,7z}", "dest": "~/Archives", "max_age_days": 60},
                {"pattern": "*.{dmg,pkg,deb,rpm,exe,msi}", "action": "delete_if_old", "max_age_days": 30},
                {"pattern": "*", "dest": "~/Downloads/Archive/{year}/{month}", "max_age_days": 14},
            ]
        },
        {
            "path": "~/Desktop",
            "rules": [
                {"pattern": "Screenshot*.{png,jpg}", "dest": "~/Pictures/Screenshots/{year}/{month}", "max_age_days": 7},
                {"pattern": "*.{pdf,doc,docx}", "dest": "~/Documents/DesktopFiles", "max_age_days": 30},
            ]
        }
    ],
    "global_exclusions": [".DS_Store", "Thumbs.db", ".localized"],
    "dry_run": False,
    "log_file": "~/.local/share/tidyspace/log.json"
}


class FileCategorizer:
    """Categorizes files based on patterns and metadata."""
    
    IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.ico'}
    DOC_EXTS = {'.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt'}
    ARCHIVE_EXTS = {'.zip', '.tar', '.gz', '.tgz', '.bz2', '.rar', '.7z'}
    INSTALLER_EXTS = {'.dmg', '.pkg', '.deb', '.rpm', '.exe', '.msi', '.appimage'}
    CODE_EXTS = {'.py', '.js', '.ts', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.rb', '.php'}
    VIDEO_EXTS = {'.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv'}
    AUDIO_EXTS = {'.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'}
    
    @classmethod
    def get_category(cls, filepath: Path) -> str:
        """Determine file category based on extension."""
        ext = filepath.suffix.lower()
        if ext in cls.IMAGE_EXTS:
            return "images"
        elif ext in cls.DOC_EXTS:
            return "documents"
        elif ext in cls.ARCHIVE_EXTS:
            return "archives"
        elif ext in cls.INSTALLER_EXTS:
            return "installers"
        elif ext in cls.CODE_EXTS:
            return "code"
        elif ext in cls.VIDEO_EXTS:
            return "videos"
        elif ext in cls.AUDIO_EXTS:
            return "audio"
        else:
            return "other"
    
    @classmethod
    def is_screenshot(cls, filepath: Path) -> bool:
        """Check if file appears to be a screenshot."""
        name_lower = filepath.name.lower()
        screenshot_patterns = ['screenshot', 'screen shot', 'screencapture', 'capture', 'img_']
        return any(pattern in name_lower for pattern in screenshot_patterns)


class TidySpace:
    """Main cleanup orchestrator."""
    
    def __init__(self, config: dict, dry_run: bool = False):
        self.config = config
        self.dry_run = dry_run
        self.actions_log: List[Dict] = []
        self.stats = defaultdict(int)
        
    def expand_path(self, path: str) -> Path:
        """Expand ~ and environment variables in path."""
        return Path(os.path.expanduser(os.path.expandvars(path)))
    
    def should_exclude(self, filepath: Path) -> bool:
        """Check if file should be excluded from processing."""
        exclusions = self.config.get("global_exclusions", [])
        return filepath.name in exclusions
    
    def get_file_age_days(self, filepath: Path) -> float:
        """Get file age in days."""
        try:
            stat = filepath.stat()
            mtime = datetime.fromtimestamp(stat.st_mtime)
            return (datetime.now() - mtime).total_seconds() / 86400
        except (OSError, FileNotFoundError):
            return 0
    
    def find_duplicates(self, directory: Path) -> List[List[Path]]:
        """Find potential duplicate files by size and name similarity."""
        files_by_size = defaultdict(list)
        
        for filepath in directory.iterdir():
            if filepath.is_file() and not self.should_exclude(filepath):
                try:
                    size = filepath.stat().st_size
                    files_by_size[size].append(filepath)
                except OSError:
                    continue
        
        # Groups with same size are potential duplicates
        duplicates = [group for group in files_by_size.values() if len(group) > 1]
        return duplicates
    
    def suggest_action(self, filepath: Path) -> Tuple[str, Optional[Path], str]:
        """
        Suggest an action for a file.
        Returns: (action, destination, reason)
        """
        age_days = self.get_file_age_days(filepath)
        category = FileCategorizer.get_category(filepath)
        
        # Screenshots get special handling
        if FileCategorizer.is_screenshot(filepath):
            dest = self.expand_path(f"~/Pictures/Screenshots/{datetime.now().year}/{datetime.now().month:02d}")
            if age_days > 7:
                return ("move", dest, f"Screenshot older than 7 days")
            return ("keep", None, "Recent screenshot")
        
        # Old installers are usually safe to delete
        if category == "installers" and age_days > 30:
            return ("delete", None, f"Old installer ({age_days:.0f} days)")
        
        # Archives older than 60 days
        if category == "archives" and age_days > 60:
            dest = self.expand_path(f"~/Archives/Downloads/{datetime.now().year}")
            return ("move", dest, f"Old archive ({age_days:.0f} days)")
        
        # Images older than 30 days
        if category == "images" and age_days > 30:
            dest = self.expand_path(f"~/Pictures/Downloads/{datetime.now().year}/{datetime.now().month:02d}")
            return ("move", dest, f"Old image ({age_days:.0f} days)")
        
        # Documents older than 90 days
        if category == "documents" and age_days > 90:
            dest = self.expand_path("~/Documents/Downloaded")
            return ("move", dest, f"Old document ({age_days:.0f} days)")
        
        # Very old files go to archive
        if age_days > 180:
            dest = self.expand_path(f"~/Archives/OldFiles/{datetime.now().year}")
            return ("move", dest, f"Very old file ({age_days:.0f} days)")
        
        return ("keep", None, "File is recent or doesn't match cleanup rules")
    
    def execute_action(self, filepath: Path, action: str, destination: Optional[Path] = None) -> bool:
        """Execute a cleanup action. Returns True if successful."""
        if self.dry_run:
            self.actions_log.append({
                "timestamp": datetime.now().isoformat(),
                "action": f"WOULD_{action.upper()}",
                "source": str(filepath),
                "destination": str(destination) if destination else None,
                "dry_run": True
            })
            return True
        
        try:
            if action == "delete":
                filepath.unlink()
                self.stats["deleted"] += 1
                
            elif action == "move" and destination:
                destination.mkdir(parents=True, exist_ok=True)
                dest_path = destination / filepath.name
                
                # Handle name collisions
                counter = 1
                original_dest = dest_path
                while dest_path.exists():
                    stem = original_dest.stem
                    suffix = original_dest.suffix
                    dest_path = destination / f"{stem}_{counter}{suffix}"
                    counter += 1
                
                shutil.move(str(filepath), str(dest_path))
                self.stats["moved"] += 1
                
            self.actions_log.append({
                "timestamp": datetime.now().isoformat(),
                "action": action,
                "source": str(filepath),
                "destination": str(destination) if destination else None,
                "success": True
            })
            return True
            
        except Exception as e:
            self.actions_log.append({
                "timestamp": datetime.now().isoformat(),
                "action": action,
                "source": str(filepath),
                "error": str(e),
                "success": False
            })
            self.stats["errors"] += 1
            return False
    
    def analyze_directory(self, directory: Path) -> Dict:
        """Analyze a directory and return findings."""
        findings = {
            "total_files": 0,
            "total_size": 0,
            "by_category": defaultdict(lambda: {"count": 0, "size": 0}),
            "old_files": [],
            "duplicates": [],
            "suggested_actions": []
        }
        
        if not directory.exists():
            return findings
        
        for filepath in directory.iterdir():
            if not filepath.is_file() or self.should_exclude(filepath):
                continue
            
            try:
                stat = filepath.stat()
                size = stat.st_size
                age_days = (datetime.now() - datetime.fromtimestamp(stat.st_mtime)).total_seconds() / 86400
                category = FileCategorizer.get_category(filepath)
                
                findings["total_files"] += 1
                findings["total_size"] += size
                findings["by_category"][category]["count"] += 1
                findings["by_category"][category]["size"] += size
                
                if age_days > 30:
                    findings["old_files"].append({
                        "path": filepath,
                        "age_days": age_days,
                        "size": size
                    })
                
                action, dest, reason = self.suggest_action(filepath)
                if action != "keep":
                    findings["suggested_actions"].append({
                        "path": filepath,
                        "action": action,
                        "destination": dest,
                        "reason": reason,
                        "size": size
                    })
                    
            except OSError:
                continue
        
        findings["duplicates"] = self.find_duplicates(directory)
        return findings
    
    def clean_directory(self, directory: Path) -> Dict:
        """Clean a single directory. Returns summary."""
        print(f"\n📁 Cleaning: {directory}")
        print("-" * 50)
        
        findings = self.analyze_directory(directory)
        
        if findings["total_files"] == 0:
            print("  Directory is empty or doesn't exist.")
            return findings
        
        print(f"  Found {findings['total_files']} files ({self._format_size(findings['total_size'])})")
        print(f"  Suggested actions: {len(findings['suggested_actions'])}")
        
        # Execute suggested actions
        for item in findings["suggested_actions"]:
            action_str = "🗑️  DELETE" if item["action"] == "delete" else f"📦 MOVE → {item['destination']}"
            print(f"  {action_str}: {item['path'].name}")
            print(f"     Reason: {item['reason']}")
            
            self.execute_action(item["path"], item["action"], item["destination"])
        
        return findings
    
    def _format_size(self, size_bytes: int) -> str:
        """Format byte size to human readable."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"
    
    def run(self) -> Dict:
        """Run cleanup on all configured targets."""
        print("=" * 60)
        print("🧹 TidySpace - Workspace Cleanup")
        print("=" * 60)
        
        if self.dry_run:
            print("\n⚠️  DRY RUN MODE - No changes will be made\n")
        
        all_findings = []
        
        for target in self.config.get("targets", []):
            path = self.expand_path(target["path"])
            findings = self.clean_directory(path)
            all_findings.append({"path": str(path), "findings": findings})
        
        # Save log
        self._save_log()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        print(f"  Files moved: {self.stats['moved']}")
        print(f"  Files deleted: {self.stats['deleted']}")
        print(f"  Errors: {self.stats['errors']}")
        
        if self.dry_run:
            print("\n💡 This was a dry run. Use --execute to apply changes.")
        
        return {
            "stats": dict(self.stats),
            "actions": self.actions_log,
            "findings": all_findings
        }
    
    def _save_log(self):
        """Save action log to file."""
        log_path = self.expand_path(self.config.get("log_file", "~/.local/share/tidyspace/log.json"))
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Load existing log
        existing_log = []
        if log_path.exists():
            try:
                with open(log_path) as f:
                    existing_log = json.load(f)
            except json.JSONDecodeError:
                pass
        
        # Append new entries
        existing_log.extend(self.actions_log)
        
        # Keep only last 1000 entries
        existing_log = existing_log[-1000:]
        
        with open(log_path, 'w') as f:
            json.dump(existing_log, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="TidySpace - Automated Workspace Cleanup")
    parser.add_argument("--dry-run", "-n", action="store_true", 
                        help="Show what would be done without making changes")
    parser.add_argument("--execute", "-x", action="store_true",
                        help="Actually perform the cleanup (default is dry run)")
    parser.add_argument("--config", "-c", type=str,
                        help="Path to custom config file")
    parser.add_argument("--analyze", "-a", type=str, metavar="PATH",
                        help="Analyze a specific directory and show findings")
    
    args = parser.parse_args()
    
    # Load config
    config = DEFAULT_CONFIG.copy()
    if args.config:
        import yaml
        with open(args.config) as f:
            config.update(yaml.safe_load(f))
    
    # Determine dry run mode
    dry_run = not args.execute if args.execute else (args.dry_run or True)
    
    tidy = TidySpace(config, dry_run=dry_run)
    
    if args.analyze:
        findings = tidy.analyze_directory(Path(args.analyze).expanduser())
        print(json.dumps(findings, indent=2, default=str))
    else:
        tidy.run()


if __name__ == "__main__":
    main()
