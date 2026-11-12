const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript'),React=require('react');
function harness(fetch){
 const state=[];let index=0;
 const hooks={...React,useState(initial){const i=index++;if(!(i in state))state[i]=initial;return [state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];},useRef(initial){const i=index++;return state[i]??(state[i]={current:initial});},useEffect(){}};
 const cache={};function load(file){if(cache[file])return cache[file];const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,Intl,AbortController,fetch,require(name){if(name==='react')return hooks;if(name.startsWith('.')){const p=path.resolve(path.dirname(file),name);return load(fs.existsSync(p+'.ts')?p+'.ts':p+'.tsx');}return require(name);}});return cache[file]=module.exports;}
 const Panel=load(path.resolve('app/components/MedicineNextSteps.tsx')).default;
 const render=()=>{index=0;return Panel({medicine:'Example 5 mg',country:'Italy',dosage:'5 mg',lang:'en',onFind(){}});};
 function walk(node){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(walk);if(typeof node.type==='function')return walk(node.type(node.props));return [node,...walk(node.props?.children)];}
 const nodes=()=>walk(render());
 const label=name=>nodes().find(n=>n.type==='label'&&n.props.children.filter(x=>typeof x==='string').join('')===name).props.children.find(x=>x&&typeof x==='object');
 const button=name=>nodes().find(n=>n.type==='button'&&n.props.children===name);
 return {nodes,label,button};
}
test('conversation has language dropdowns and two facing sides without typed language names',()=>{
 const h=harness(()=>{throw Error('No unsolicited network');});
 const language=h.label('Translate into');assert.equal(language.type,'select');assert.equal(language.props.value,'');
 assert.equal(h.label('Your language').type,'select');
 const options=h.nodes().filter(n=>n.type==='option');assert.ok(options.length>=369);
 for(const code of ['it','ar','zh','sw','uk','ur'])assert.ok(options.some(n=>n.props.value===code));
 assert.ok(h.nodes().some(n=>n.type==='dialog'&&n.props['aria-label']==='Face-to-face conversation'));
 assert.ok(h.nodes().some(n=>n.props?.className==='conversation-half conversation-professional'));
 assert.ok(h.nodes().some(n=>n.props?.['aria-label']==='Patient side'));
 assert.equal(h.nodes().filter(n=>n.type==='input').length,0);
});
test('forward and reply translations target the other person and changing language clears old results',async()=>{
 const calls=[];const h=harness(async(url,init)=>{calls.push({url,...JSON.parse(init.body)});return {ok:true,json:async()=>({result:calls.length===1?'Buongiorno':'Hello again'})};});
 h.label('Translate into').props.onChange({target:{value:'it'}});
 h.label('Your message to the pharmacist').props.onChange({target:{value:'Hello, 5 mg'}});
 await h.button('Translate message').props.onClick();
 assert.equal(calls[0].target,'Italian');assert.equal(calls[0].text,'Hello, 5 mg');assert.equal(calls[0].url,'/api/translate');
 assert.ok(h.nodes().some(n=>n.props?.children==='Buongiorno'));
 h.label('Your reply').props.onChange({target:{value:'Buongiorno, 5 mg'}});
 await h.button('Translate reply into English').props.onClick();
 assert.equal(calls[1].target,'English');assert.equal(calls[1].text,'Buongiorno, 5 mg');
 assert.ok(h.nodes().some(n=>n.props?.children==='Hello again'));
 h.label('Translate into').props.onChange({target:{value:'fr'}});
 assert.ok(!h.nodes().some(n=>['Buongiorno','Hello again'].includes(n.props?.children)));
});
test('failed translations show a retry message without pretending a result exists',async()=>{
 const h=harness(async()=>({ok:false,json:async()=>({error:'private provider detail'})}));
 h.label('Translate into').props.onChange({target:{value:'it'}});
 await h.button('Translate message').props.onClick();
 assert.ok(h.nodes().some(n=>n.props?.role==='alert'&&n.props.children==='Translation is unavailable. Please retry.'));
 assert.ok(!h.nodes().some(n=>n.props?.children==='private provider detail'));
});
