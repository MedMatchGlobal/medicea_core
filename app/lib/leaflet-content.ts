type TextBlock={kind:'paragraph'|'list';lines:string[]};
type TableBlock={kind:'table';headers:string[];rows:string[][];align:Array<'left'|'center'|'right'>};
export type LeafletContentBlock=TextBlock|TableBlock;
function cells(line:string){
 const parts:string[]=[];let value='',code=false;
 for(let i=0;i<line.length;i++){
  const char=line[i];
  if(char==='\\'&&line[i+1]==='|'){value+='|';i++;continue;}
  if(char==='`')code=!code;
  if(char==='|'&&!code){parts.push(value.trim());value='';}else value+=char;
 }
 parts.push(value.trim());
 if(line.trimStart().startsWith('|'))parts.shift();
 if(line.trimEnd().endsWith('|'))parts.pop();
 return parts;
}
export function leafletContentBlocks(text:string):LeafletContentBlock[]{
 const lines=text.split(/\r?\n/),blocks:LeafletContentBlock[]=[];let current:TextBlock|undefined;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line){current=undefined;continue;}
  const header=cells(line),separator=i+1<lines.length?cells(lines[i+1].trim()):[];
  if(header.length>1&&separator.length===header.length&&separator.every(cell=>/^:?-{3,}:?$/.test(cell))){
   const rows:string[][]=[];i++;
   while(i+1<lines.length&&lines[i+1].trim()&&cells(lines[i+1].trim()).length>1)rows.push(cells(lines[++i].trim()));
   const width=Math.max(header.length,...rows.map(row=>row.length));
   // Retain extra cells rather than silently discard model-provided content.
   while(header.length<width)header.push('');
   blocks.push({kind:'table',headers:header,rows,align:header.map((_,j)=>/^:.*:$/.test(separator[j]||'')?'center':/:$/.test(separator[j]||'')?'right':'left')});
   current=undefined;continue;
  }
  const match=line.match(/^(?:[-*•–—]|\d+[.)])\s+(.+)$/),kind=match?'list':'paragraph';
  if(!current||current.kind!==kind){current={kind,lines:[]};blocks.push(current);}
  current.lines.push(match?match[1]:line);
 }
 return blocks;
}
