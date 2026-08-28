import codecs

filepath = 'C:\\Projects\\myapp\\src\\components\\RosterGrid.tsx'
with codecs.open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Wrap tbody in useMemo
tbody_start = content.find('          <tbody>')
tbody_end = content.find('          </tbody>\n') + len('          </tbody>\n')

tbody_content = content[tbody_start:tbody_end]

# We extract this into `renderedTbody` right before the return statement.
return_idx = content.find('  return (\n    <div className="roster-scroll-parent"')

rendered_tbody_decl = f"""
  const renderedTbody = useMemo(() => (
{tbody_content}  ), [days, stationsByLocation, shiftsByDate, leavesByDate, filterUserIds, data.users, currentUser.permissions, currentUser.role, year, month, activeModalities, publicHolidaysMap]);

"""

# Insert `renderedTbody` before `return`
content = content[:return_idx] + rendered_tbody_decl + content[return_idx:]

# Replace the actual tbody in the JSX with `{renderedTbody}`
# Wait, the `tbody_content` is now duplicated, we need to remove it from the JSX!
# Find it again, but since we inserted before return, the JSX is AFTER return_idx.
# Actually, it's easier to just do it in one pass:

with codecs.open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
    original = f.read()

tbody_start = original.find('          <tbody>')
tbody_end = original.find('          </tbody>\n') + len('          </tbody>\n')
tbody_content = original[tbody_start:tbody_end]

return_idx = original.find('  return (\n    <div className="roster-scroll-parent"')

rendered_tbody_decl = f"""  const renderedTbody = useMemo(() => (
{tbody_content}  ), [days, stationsByLocation, shiftsByDate, leavesByDate, filterUserIds, data.users, currentUser.permissions, currentUser.role, year, month, activeModalities, publicHolidaysMap]);

"""

part1 = original[:tbody_start]
part2 = "          {renderedTbody}\n"
part3 = original[tbody_end:]

# part1 + part2 + part3 is the file with `{renderedTbody}` instead of the raw tbody.
# Now insert `rendered_tbody_decl` before `return_idx`.

new_content = part1 + part2 + part3
new_return_idx = new_content.find('  return (\n    <div className="roster-scroll-parent"')
final_content = new_content[:new_return_idx] + rendered_tbody_decl + new_content[new_return_idx:]

with codecs.open(filepath, 'w', encoding='utf-8') as f:
    f.write(final_content)

print("done")
