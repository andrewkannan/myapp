import re

filepath = 'C:\\Projects\\myapp\\src\\components\\RosterGrid.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. usersMap optimization
if 'const usersMap' not in content:
    content = content.replace(
        "const publicHolidaysMap",
        "const usersMap = useMemo(() => new Map(data.users.map(u => [u.id, u])), [data.users]);\n  const publicHolidaysMap"
    )

content = content.replace(
    "const shiftUser = data.users.find(u => u.id === shift.userId) || shift.user;",
    "const shiftUser = usersMap.get(shift.userId) || shift.user;"
)
content = content.replace(
    "const leaveUser = data.users.find(u => u.id === leave.userId) || leave.user;",
    "const leaveUser = usersMap.get(leave.userId) || leave.user;"
)

# 2. getLocalDateString optimization in getCellShifts
content = content.replace(
    "const getCellShifts = (date: Date, stationId: string | null, status: string) => {\n    const dStr = getLocalDateString(date);",
    "const getCellShifts = (dateStr: string, stationId: string | null, status: string) => {\n    const dStr = dateStr;"
)

content = content.replace(
    "const shifts = getCellShifts(date, station.id, 'Scheduled');",
    "const shifts = getCellShifts(dateKey, station.id, 'Scheduled');"
)

content = content.replace(
    "const dayLeaves = leavesByDate.get(getLocalDateString(date)) || [];",
    "const dayLeaves = leavesByDate.get(dateKey) || [];"
)

content = content.replace(
    "const dayShifts = shiftsByDate.get(getLocalDateString(date)) || [];",
    "const dayShifts = shiftsByDate.get(dateKey) || [];"
)

# Wait, `getLocalDateString(date)` might be used somewhere else in the code, like inside the `AssignmentModal` or `handleCellClick`.
# Actually, handleCellClick still passes `date: Date`. 
# In AssignmentModal, it gets `currentShifts={getCellShifts(selectedCell.date, ...)}`.
# We need to make sure getCellShifts accepts BOTH Date and string, or we convert date to string there!
content = content.replace(
    "currentShifts={getCellShifts(selectedCell.date, selectedCell.station?.id || null, selectedCell.status)}",
    "currentShifts={getCellShifts(getLocalDateString(selectedCell.date), selectedCell.station?.id || null, selectedCell.status)}"
)

# Also let's change `const getCellShifts = (date: Date,` back to `dateStr` but add `getLocalDateString` to `handleCellClick` if it uses it.
# Wait, handleCellClick doesn't use `getCellShifts`.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done optimizations")
