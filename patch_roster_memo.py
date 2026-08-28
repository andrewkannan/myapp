import os

filepath = 'C:\\Projects\\myapp\\src\\components\\RosterGrid.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to insert `const renderedTable = useMemo(...)` right before `return (` at the bottom of the component.
# The bottom `return (` looks like:
#   return (
#     <div className="roster-scroll-parent" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>

target = '  return (\n    <div className="roster-scroll-parent" style={{ width: \'100%\', height: \'100%\', display: \'flex\', flexDirection: \'column\' }}>\n      <div className="roster-scroll"'
start_idx = content.find(target)

if start_idx != -1:
    end_scroll_idx = content.find('      {modalOpen && selectedCell && (', start_idx)
    
    # The actual table html starts at `<div className="roster-scroll"`
    table_start = content.find('<div className="roster-scroll"', start_idx)
    table_html = content[table_start:end_scroll_idx].strip()
    
    new_code = f"""
  const renderedTable = useMemo(() => (
    {table_html}
  ), [visibleDays, stationsByLocation, shiftsByDate, leavesByDate, filterUserIds, data.users, currentUser.permissions, currentUser.role, year, month, activeModalities]);

  return (
    <div className="roster-scroll-parent" style={{{{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}}}>
      {{renderedTable}}

      {{modalOpen && selectedCell && ("""
      
    # Replace from `target` to `end_scroll_idx + len('      {modalOpen && selectedCell && (')`
    end_replace_idx = end_scroll_idx + len('      {modalOpen && selectedCell && (')
    
    content = content[:start_idx] + new_code + content[end_replace_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed useMemo")
