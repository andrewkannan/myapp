import os
import codecs

filepath = 'C:\\Projects\\myapp\\src\\components\\RosterGrid.tsx'

with codecs.open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. usersMap
if 'const usersMap' not in content:
    content = content.replace(
        "const publicHolidaysMap",
        "const usersMap = useMemo(() => new Map(data.users.map(u => [u.id, u])), [data.users]);\n  const publicHolidaysMap"
    )

# 2. data.users.find -> usersMap.get
content = content.replace(
    "const shiftUser = data.users.find(u => u.id === shift.userId) || shift.user;",
    "const shiftUser = usersMap.get(shift.userId) || shift.user;"
)
content = content.replace(
    "const leaveUser = data.users.find(u => u.id === leave.userId) || leave.user;",
    "const leaveUser = usersMap.get(leave.userId) || leave.user;"
)

# 3. getLocalDateString(date) optimization
# In getCellShifts:
content = content.replace(
    "const getCellShifts = (date: Date, stationId: string | null, status: string) => {\n    const dStr = getLocalDateString(date);",
    "const getCellShifts = (dateStr: string, stationId: string | null, status: string) => {\n    const dStr = dateStr;"
)
# Inside the row map, it was calling `getCellShifts(date, ...)`
content = content.replace(
    "const shifts = getCellShifts(date, station.id, 'Scheduled');",
    "const shifts = getCellShifts(dateKey, station.id, 'Scheduled');"
)
# For absences and leaves:
content = content.replace(
    "const dayLeaves = leavesByDate.get(getLocalDateString(date)) || [];",
    "const dayLeaves = leavesByDate.get(dateKey) || [];"
)
content = content.replace(
    "const dayShifts = shiftsByDate.get(getLocalDateString(date)) || [];",
    "const dayShifts = shiftsByDate.get(dateKey) || [];"
)

# 4. locations lookup
content = content.replace(
    "stationsByLocation.flatMap(loc => loc.stations).map(station => {",
    "stationsByLocation.flatMap(loc => loc.stations.map(station => ({ station, locName: loc.name }))).map(({ station, locName }) => {"
)
# Remove the expensive .find()
content = content.replace(
    "const locName = stationsByLocation.find(l => l.id === station.locationId)?.name || '';\n",
    ""
)

# 5. useMemo wrapper for the massive <tbody> to prevent modal clicks from freezing
# We will just wrap the <tbody>
if 'const renderedTbody = useMemo' not in content:
    tbody_start = content.find('          <tbody>')
    tbody_end = content.find('          </tbody>') + len('          </tbody>')
    tbody_content = content[tbody_start:tbody_end]
    
    new_code = f"""          {{useMemo(() => (
  {tbody_content}
          ), [days, stationsByLocation, shiftsByDate, leavesByDate, filterUserIds, usersMap, currentUser.permissions, currentUser.role, year, month, activeModalities, publicHolidaysMap])}}"""
          
    content = content[:tbody_start] + new_code + content[tbody_end:]

with codecs.open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied optimizations safely")
