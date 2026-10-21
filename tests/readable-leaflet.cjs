const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),vm=require('node:vm'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const root=path.join(__dirname,'..');
function load(file){const filename=path.resolve(root,file),mod={exports:{}};const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(source,{module:mod,exports:mod.exports,URL,require:id=>id==='./StructuredLeafletSections'?{sourceLabels:{en:'Sources',it:'Fonti'}}:id.startsWith('.')?load(path.relative(root,path.resolve(path.dirname(filename),id))+'.ts'):require(id)});return mod.exports;}
const Component=load('app/components/ReadableLeaflet.tsx').default;
test('leaflet retains prose, bullets, introduction and formulation with compact attributable links',()=>{
 const html=renderToStaticMarkup(React.createElement(Component,{text:'This covers a product family.\nNote:\nRead the pack leaflet.\n- First warning.\nKeep this paragraph too.\nFormulation:\n- Tablet.\nAverage Selling Price:\n- Variant A, 24 pack: £7.99 (https://example.org/listing).\n- Variant B, 32 pack: £8.59 [Retailer](https://example.org/listing).'}));
 for(const phrase of ['product family','Read the pack leaflet','First warning','Keep this paragraph too','Tablet.','24 pack: £7.99','32 pack: £8.59'])assert.ok(html.includes(phrase),phrase);
 assert.match(html,/<h4>Formulation<\/h4>/);assert.match(html,/Sources \(1\)/);assert.match(html,/href="https:\/\/example.org\/listing"/);assert.ok(!html.includes('listing</'));assert.equal((html.match(/\[1\]/g)||[]).length,2);
});
test('unrecognised text stays visible and source labels follow the interface language',()=>{
 const html=renderToStaticMarkup(React.createElement(Component,{text:'Entire original narrative.\n- Visible bullet.',lang:'it',sourceUrls:['https://example.org/pil','javascript:alert(1)']}));
 assert.match(html,/Entire original narrative/);assert.match(html,/Visible bullet/);assert.match(html,/Fonti \(1\)/);assert.ok(!html.includes('javascript:'));
});
