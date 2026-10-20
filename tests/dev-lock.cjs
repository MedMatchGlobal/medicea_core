const test=require('node:test'),assert=require('node:assert/strict');
const {violations,check}=require('../scripts/check-dev-lock.cjs');
test('Dev freeze blocks leaflet, equivalence, UI, dependency, deployment and new application files',()=>{
 const changes=['app/lib/grounded-leaflet.ts','app/lib/origin-identification.ts','app/MedicineWorkspace.tsx','package.json','package-lock.json','next.config.ts','vercel.json','.github/workflows/deploy.yml','app/api/new-price/route.ts'];
 assert.deepEqual(violations(changes,true),changes);
 assert.deepEqual(violations(['app/lib/leaflet-price.ts']),['app/lib/leaflet-price.ts']);
 assert.deepEqual(violations(['app/lib/leaflet-price.ts'],true),[]);
 assert.deepEqual(violations(['AGENTS.md','reports/price-analysis.md','tests/price-investigation.cjs'],false),[]);
});
test('working application matches the owner-verified frozen checkpoint',()=>{assert.deepEqual(check(false).permittedChanges,[]);});
