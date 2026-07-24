import os
import re

filepath = r"C:\Users\משתמש\.gemini\antigravity\brain\c5ffa78d-2c39-40df-aa82-4aaeb5c65287\.system_generated\steps\3\content.md"

if not os.path.exists(filepath):
    print("File not found")
    exit()

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print("Total lines:", len(lines))
count = 0
for idx, line in enumerate(lines):
    if "2026" in line and any(month in line for month in ["Nov", "Dec", "November", "December"]):
        count += 1
        print(f"Match {count} at Line {idx}:")
        for i in range(max(0, idx-4), min(len(lines), idx+5)):
            print(f"  {i}: {lines[i].strip()[:150]}")
        print("-" * 40)
