const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),ts=require('typescript');
const src=fs.readFileSync('app/lib/emergency-contact.ts','utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:'commonjs',target:'es2020'}}).outputText;
const m={exports:{}};new Function('module','exports',js)(m,m.exports);
const {cleanNumber,cleanContact,smsHref,mapsLink}=m.exports;
test('numbers are cleaned, bad ones rejected',()=>{
 assert.equal(cleanNumber('+44 7700 900123'),'+447700900123');
 assert.equal(cleanNumber('(02) 1234-5678'),'0212345678');
 assert.equal(cleanNumber('123'),'');assert.equal(cleanNumber('abc'),'');assert.equal(cleanNumber(undefined),'');
});
test('contact keeps name without markup',()=>{
 assert.deepEqual(cleanContact({name:'<b>Anna</b>',number:'+39 333 1234567'}),{name:'bAnna/b',number:'+393331234567'});
 assert.equal(cleanContact({name:'x',number:'1'}),null);
});
test('sms link carries the number and encoded text; maps link has coordinates',()=>{
 const link=smsHref('+44 7700 900123','SOS: I need help. My location: '+mapsLink(51.5,-0.12));
 assert.ok(link.startsWith('sms:+447700900123?&body='));
 assert.ok(decodeURIComponent(link).includes('query=51.500000,-0.120000'));
});
