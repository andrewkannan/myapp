import os

filepath = 'C:\\Projects\\myapp\\src\\components\\RosterGrid.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'useProgressiveRender' not in content:
    content = content.replace("import { useState, useMemo } from 'react';", "import { useState, useMemo, useEffect } from 'react';\nimport { useProgressiveRender } from '@/hooks/useProgressiveRender';")

# 2. Add tableLayout: 'fixed'
content = content.replace(
    "<table id=\"roster-table\" style={{ borderCollapse: 'collapse'",
    "<table id=\"roster-table\" style={{ tableLayout: 'fixed', borderCollapse: 'collapse'"
)

# 3. Add progressive render for days
if 'const visibleDays =' not in content:
    content = content.replace(
        "const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);",
        "const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);\n  const visibleDays = useProgressiveRender(days, 10, 50);"
    )
    content = content.replace(
        "{days.map(date => {",
        "{visibleDays.map(date => {"
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated RosterGrid successfully.")
