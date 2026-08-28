import os

filepath = 'C:\\Projects\\myapp\\src\\components\\RosterGrid.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "const visibleDays = useProgressiveRender(days, 10, 50);\n  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {\n    return new Date(year, month - 1, i + 1);\n  }), [year, month, daysInMonth]);",
    "const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {\n    return new Date(year, month - 1, i + 1);\n  }), [year, month, daysInMonth]);\n  const visibleDays = useProgressiveRender(days, 10, 50);"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed ordering")
