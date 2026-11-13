const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
module.exports=function load(file){
 if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInNewContext(js,{module,exports:module.exports,URLSearchParams,require(name){if(!name.startsWith('.'))return require(name);const target=path.resolve(path.dirname(file),name);return load(fs.existsSync(target)?target:fs.existsSync(target+'.ts')?target+'.ts':target+'.tsx');}});return module.exports;
};
