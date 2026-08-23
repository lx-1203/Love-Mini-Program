#!/usr/bin/env python3
"""Batch update profile page design tokens - only CSS/style values."""
import os
import re

BASE = r"d:\6\恋爱小程序\apps\client\src"

# All profile-related directories
DIRS = [
    os.path.join(BASE, "pages", "profile"),
    os.path.join(BASE, "components", "profile"),
]

# Color/style token replacements (order matters for some)
REPLACEMENTS = [
    # Primary text colors
    ("#222222", "#333A37"),
    ("#1E1E1E", "#333A37"),
    ("#1A1E1C", "#333A37"),
    ("#1f2937", "#333A37"),
    
    # Secondary text
    ("#666666", "#4A524E"),
    
    # Tertiary text (body)
    ("#777777", "#6B7571"),
    ("#8A9694", "#6B7571"),
    
    # Quaternary text (meta)
    ("#999999", "#9AA39F"),
    ("#9ca3af", "#9AA39F"),
    
    # Brand green variants
    ("#168B65", "#36C99A"),
    ("#12805A", "#36C99A"),
    ("#1F8D6A", "#36C99A"),
    ("#0d9488", "#36C99A"),
    
    # Romance pink
    ("#F472B6", "#FF6B81"),
    
    # Purple
    ("#8D7BFF", "#A29BFE"),
    
    # Orange/warning
    ("#FF9A57", "#FF9F43"),
    ("#F59E0B", "#FF9F43"),
    
    # Shadow RGB values
    ("rgba(61, 201, 148", "rgba(54, 201, 154"),
    ("rgba(255, 104, 145", "rgba(255, 107, 129"),
    
    # Border colors
    ("#ECEFF2", "#EEF2F0"),
    ("#E2E8F0", "#DDE3E0"),
    ("#CBD5E1", "#C2CAC6"),
    ("#eef1f5", "#EEF2F0"),
    ("#EEF3F1", "#EEF2F0"),
    
    # Standardize light green backgrounds
    ("#E8FAF3", "#E8FBF3"),
    ("#E8F8F1", "#E8FBF3"),
    ("#E8F8F0", "#E8FBF3"),
    ("#EAF8F3", "#E8FBF3"),
    ("#E6F5EF", "#E8FBF3"),
    
    # Pink variant
    ("#FF6B91", "#FF6B81"),
]

def collect_files():
    files = []
    for d in DIRS:
        for root, _, fnames in os.walk(d):
            for fn in fnames:
                if fn.endswith(".vue"):
                    files.append(os.path.join(root, fn))
    return sorted(files)

def main():
    files = collect_files()
    print(f"Found {len(files)} Vue files")
    
    total_changes = 0
    files_modified = 0
    details = {}
    
    for fpath in files:
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        original = content
        
        file_count = 0
        for old, new in REPLACEMENTS:
            if old in content:
                count = content.count(old)
                content = content.replace(old, new)
                file_count += count
        
        if content != original:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(content)
            files_modified += 1
            total_changes += file_count
            short = fpath.replace(BASE + "\\", "").replace(BASE + "/", "")
            details[short] = file_count
            print(f"  {short}: {file_count} replacements")
    
    print(f"\n=== SUMMARY ===")
    print(f"Files modified: {files_modified}")
    print(f"Total replacements: {total_changes}")
    print(f"\nDetailed changes:")
    for k in sorted(details.keys()):
        print(f"  {k}: {details[k]} replacements")

if __name__ == "__main__":
    main()
