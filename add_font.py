import re
import os

file_path = "c:/Users/ASUS/Desktop/NVCC/volunteer-system/components/AdminReportsDashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def inject_font(match):
    block = match.group(0)
    if 'fontFamily' not in block:
        # insert fontFamily right before fontSize
        return re.sub(r'(\s+)(fontSize\s*:)', r'\1fontFamily: Platform.OS === \'web\' ? "\'Nunito\', sans-serif" : \'Nunito\',\1\2', block)
    return block

# This regex matches a style object: `key: { ... },`
new_content = re.sub(r'[a-zA-Z0-9_]+\s*:\s*\{[^}]*fontSize\s*:[^}]*\}', inject_font, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Done")
