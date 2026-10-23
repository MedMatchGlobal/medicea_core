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

test('summary leads with uses while source commentary remains in expandable details',()=>{
 const html=renderToStaticMarkup(React.createElement(Component,{text:'Note:\nRetrieved from an older leaflet.\nSummary:\nUsed for the relief of fictional symptoms.\nIndications:\n- Used for the relief of fictional symptoms.\nContraindications:\n- Do not use with a fictional allergy.'}));
 assert.match(html,/<h4>Summary<\/h4>/);assert.ok(html.indexOf('<h4>Summary')<html.indexOf('<h4>Indications'));
 assert.ok(!html.includes('<h4>Note'));assert.match(html,/<summary>Leaflet details<\/summary>/);assert.match(html,/Retrieved from an older leaflet/);assert.match(html,/leaflet-section--caution/);
});
test('saved leaflet uses its existing indication for the summary without losing the full indication',()=>{
 const html=renderToStaticMarkup(React.createElement(Component,{text:'Note:\nOriginal source qualification.\nIndications:\n- Relief of fictional symptoms. More detail stays below.',lang:'it'}));
 assert.match(html,/<h4>Riepilogo<\/h4>/);assert.match(html,/More detail stays below/);assert.match(html,/Original source qualification/);
});

test('Markdown price table renders headers, cells, links and surrounding notes without flattening values',()=>{
 const text='Average Selling Price:\nRetail quotes.\n\n| Product | Prices found | Approx. average |\n| --- | --- | ---: |\n| Max, 24 | £8.99 [Shop](https://example.org/price) | £8.75 |\n| Plus, 32 | £7.39; £7.99 | £7.70 |\n\nThese prices vary.';
 const html=renderToStaticMarkup(React.createElement(Component,{text}));assert.match(html,/<table>/);assert.match(html,/<th[^>]*scope="col"[^>]*>Product/);assert.match(html,/<td[^>]*>Max, 24/);for(const value of ['£8.99','£8.75','£7.39; £7.99','£7.70','Retail quotes.','These prices vary.'])assert.ok(html.includes(value),value);assert.match(html,/href="https:\/\/example.org\/price"/);assert.ok(!html.includes('| ---'));
});
test('escaped pipes and incomplete streamed rows keep their content',()=>{
 const html=renderToStaticMarkup(React.createElement(Component,{text:'Average Selling Price:\n| Product | Price |\n| --- | --- |\n| A \\| B | £8.99 |\n| Still arriving |'}));assert.match(html,/A \| B/);assert.match(html,/£8.99/);assert.match(html,/Still arriving/);
});

test('new and saved price headings display indicative retail prices with preserved content',()=>{for(const heading of ['Indicative retail prices','Average Selling Price']){const html=renderToStaticMarkup(React.createElement(Component,{text:heading+':\n- Public fixture 24 pack: £7.99.',headings:{'Average Selling Price':'Average Selling Price'}}));assert.match(html,/<h4>Indicative Retail Prices<\/h4>/);assert.match(html,/leaflet-section--price/);assert.match(html,/24 pack: £7.99/);assert.ok(!html.includes('<h4>Average'));}});
