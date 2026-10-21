const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../app/MedicineWorkspace.tsx'),'utf8'),ast=ts.createSourceFile('workspace.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='returnToResultList')handler=node.getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(handler);
function run({choices=[],view={}}={}){
 const events=[],historyState={router:'retained',mediceaMedicineResults:true},context={viewLeaflet:view,originChoiceHistory:{current:choices},setOriginLeafletVisible:v=>events.push(['originLeaflet',v]),setViewLeaflet:v=>events.push(['leaflets',Object.keys(v)]),setOriginVariants:v=>events.push(['choices',v]),showScreen:v=>events.push(['screen',v]),window:{history:{state:historyState,replaceState:v=>events.push(['history',v])}},resultHistoryState:state=>({...state,mediceaMedicineLeaflet:undefined}),requestAnimationFrame:fn=>fn(),document:{getElementById:id=>({scrollIntoView:options=>events.push(['scroll',id,options.block])})},fetch:()=>{throw Error('Navigation must not start a lookup');}};
 vm.runInNewContext('('+handler+')()',context);return events;
}
test('return after a no-match selection restores the original choices rather than merely collapsing a leaflet',()=>{
 const choices=[{name:'8/500',token:'fixture-8'},{name:'15/500',token:'fixture-15'},{name:'30/500',token:'fixture-30'}],events=run({choices});assert.equal(events.find(e=>e[0]==='choices')[1],choices);assert.equal(events.some(e=>e[0]==='screen'),false);assert.equal(events.find(e=>e[0]==='originLeaflet')[1],false);assert.equal(events.find(e=>e[0]==='scroll')[1],'search-results');
});
test('return from an equivalent leaflet first restores its existing equivalent list',()=>{
 const events=run({choices:[{name:'30/500'}],view:{'Returned product':true}});assert.equal(events.some(e=>e[0]==='choices'||e[0]==='screen'),false);assert.equal(events.find(e=>e[0]==='leaflets')[1].length,0);assert.equal(events.find(e=>e[0]==='history')[1].router,'retained');
});
test('a search without a previous choice list returns to its retained form',()=>{
 const events=run();assert.equal(events.find(e=>e[0]==='screen')[1],'search');assert.equal(events.some(e=>e[0]==='choices'),false);
});
test('one subtle header control replaces duplicate conditional leaflet controls',()=>{
 const buttons=[];
 function inspect(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(ast)==='button'&&node.openingElement.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.getText(ast)==='onClick'&&p.initializer?.getText(ast)==='{returnToResultList}'))buttons.push(node.getText(ast));ts.forEachChild(node,inspect);}inspect(ast);
 assert.equal(buttons.length,1);assert.match(buttons[0],/className="results-back"/);assert.match(source,/className="results-title-row"><h2>/);assert.match(source,/!originVariants.length&&<>/);assert.match(source,/originChoiceHistory.current=failure.variants/);
});
