const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL || 'https://nwmxpitlnfgjbrbydjhn.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_G4iqz6xwKBK3sbN3T3pgQg_SpdTMBC7';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runSecurityAudit() {
  console.log('=== RSB ERP SUPABASE SECURITY POLICY AUDIT ===\n');

  // 1. Anonymous Client Test
  const anonClient = createClient(url, anonKey);

  console.log('1. Testing Anonymous Public Client:');
  const { data: catData, error: catErr } = await anonClient.from('materials').select('code, name').limit(2);
  console.log('   - Read raw materials catalog:', catErr ? `FAIL: ${catErr.message}` : `SUCCESS (Retrieved ${catData?.length} items)`);

  const { data: custData, error: custErr } = await anonClient.from('customers').select('name').limit(2);
  console.log('   - Read customers directory:', custErr ? `FAIL: ${custErr.message}` : `SUCCESS (Retrieved ${custData?.length} items)`);

  // 2. Authenticated Staff Test
  console.log('\n2. Testing Authenticated Admin Session:');
  const authClient = createClient(url, anonKey);
  const { data: authData, error: authErr } = await authClient.auth.signInWithPassword({
    email: 'admin@rsbequipments.com',
    password: 'Admin@123'
  });

  if (authErr) {
    console.log('   - Admin sign-in:', `FAIL: ${authErr.message}`);
  } else {
    console.log('   - Admin sign-in:', `SUCCESS (User: ${authData.user.email}, Role: authenticated)`);
    
    // Read and verify active access
    const { data: prj, error: prjErr } = await authClient.from('projects').select('id, name');
    console.log('   - Authenticated project read:', prjErr ? `FAIL: ${prjErr.message}` : `SUCCESS (Projects: ${prj?.length})`);

    const { data: reqs, error: reqsErr } = await authClient.from('project_material_requirements').select('id');
    console.log('   - Authenticated requirements read:', reqsErr ? `FAIL: ${reqsErr.message}` : `SUCCESS (Requirements: ${reqs?.length})`);
  }

  // 3. User Directory Protection Test
  console.log('\n3. Testing User Directory & Role Security:');
  const { data: users, error: userErr } = await anonClient.from('erp_users').select('id, name, role');
  console.log('   - User directory check:', userErr ? `BLOCKED (${userErr.message})` : `ACCESSIBLE (${users?.length} users active)`);

  console.log('\n=== AUDIT COMPLETE ===');
}

runSecurityAudit();
