import re

filepath = 'C:\\Projects\\myapp\\src\\components\\RosterGrid.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find <tbody>...</tbody>
match = re.search(r'(          <tbody>.*?          </tbody>)', content, re.DOTALL)
if match:
    tbody_content = match.group(1)
    
    # We will replace the `<tbody>...</tbody>` inside the JSX with `{renderedTbody}`
    content = content.replace(tbody_content, '          {renderedTbody}')
    
    # And we insert `const renderedTbody = useMemo(() => (\n  <tbody>...</tbody>\n), [...]);` before `return (`
    return_match = re.search(r'  return \(\s*<div className="roster-scroll-parent"', content)
    if return_match:
        idx = return_match.start()
        
        memo_decl = f"""  const renderedTbody = useMemo(() => (
{tbody_content}
  ), [days, stationsByLocation, shiftsByDate, leavesByDate, filterUserIds, data.users, currentUser.permissions, currentUser.role, year, month, activeModalities, publicHolidaysMap]);

"""
        content = content[:idx] + memo_decl + content[idx:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Successfully memoized tbody.")
    else:
        print("Could not find return statement.")
else:
    print("Could not find tbody.")
