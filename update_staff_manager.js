const fs = require('fs');
let content = fs.readFileSync('src/components/admin/StaffManager.tsx', 'utf8');

// 1. Add state for lists and fetch them
const oldStates = `  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {`;

const newStates = `  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [systemRoles, setSystemRoles] = useState<string[]>([]);
  const [systemModalities, setSystemModalities] = useState<string[]>([]);

  const fetchUsers = async () => {`;

content = content.replace(oldStates, newStates);

const oldFetch = `  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };`;

const newFetch = `  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      
      const listsRes = await fetch('/api/system-lists');
      const listsData = await listsRes.json();
      
      const roles = (listsData.roles || []).map((r: any) => r.name);
      if (!roles.includes('Scheduler')) roles.push('Scheduler');
      if (!roles.includes('System Admin')) roles.push('System Admin');
      setSystemRoles(roles);
      
      setSystemModalities((listsData.modalities || []).map((m: any) => m.name));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };`;

content = content.replace(oldFetch, newFetch);

// 2. Replace the hardcoded role map
const oldRoleMap = `{['Radiographer', 'Sonographer', 'Nurse', 'Doctor', 'Scheduler', 'System Admin'].map(roleOption => {`;
const newRoleMap = `{systemRoles.map(roleOption => {`;
content = content.replace(oldRoleMap, newRoleMap);

// 3. Replace the hardcoded modality map
const oldModalityMap = `{['MRI', 'CT', 'US', 'X-Ray', 'PET/CT', 'Mammo'].map(modalityOption => {`;
const newModalityMap = `{systemModalities.map(modalityOption => {`;
content = content.replace(oldModalityMap, newModalityMap);

fs.writeFileSync('src/components/admin/StaffManager.tsx', content);
