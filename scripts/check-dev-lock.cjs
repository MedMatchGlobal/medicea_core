const {execFileSync}=require('node:child_process');
const path=require('node:path');
const LOCKED_COMMIT='933511cd5115a507c9a04f846640eb5c813e4938';
const PRICE_FILE='app/lib/leaflet-price.ts';
function protectedFile(file){return /^(app|lib|public|components|styles|src|pages|prisma|\.github)\//.test(file)||/^(package(?:-lock)?\.json|(?:pnpm-lock\.yaml|yarn\.lock)|tsconfig\.json|vercel\.json|middleware\.[cm]?[jt]s|[^/]+\.config\.[^/]+|\.env(?:\.[^/]+)?)$/.test(file);}
function violations(files,priceOnly=false){return [...new Set(files)].filter(file=>protectedFile(file)&&!(priceOnly&&file===PRICE_FILE));}
function check(priceOnly=false){
 const cwd=path.join(__dirname,'..');
 const git=args=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
 const changed=git(['diff','--name-only',LOCKED_COMMIT,'--']);
 const untracked=git(['ls-files','--others','--exclude-standard']);
 const blocked=violations([...changed,...untracked],priceOnly);
 if(blocked.length)throw Error('Locked Dev application changed outside permitted scope:\n'+blocked.join('\n'));
 return {lockedCommit:LOCKED_COMMIT,mode:priceOnly?'price-only':'exact-freeze',permittedChanges:[...changed,...untracked].filter(protectedFile)};
}
if(require.main===module){try{const args=process.argv.slice(2);if(args.some(a=>a!=='--price-only'))throw Error('Only --price-only is supported');console.log(JSON.stringify(check(args.includes('--price-only')),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={LOCKED_COMMIT,protectedFile,violations,check};
