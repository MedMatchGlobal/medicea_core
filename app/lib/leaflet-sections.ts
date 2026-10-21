const headings=['Manufacturer','Description','Overview','What it is','Active Ingredient','Active Ingredients','Mechanism of Action','How it Works','Uses','Indications','Posology','Strength','Formulation','Dosage','Interactions','Side Effects','Precautions','Contraindications','Warnings','Legal Classification','Storage','Average Selling Price','Note','Disclaimer'];
export function leafletSections(text:string){
 // Section labels must start a line. A mention of manufacturer/regulator in
 // prose is not a heading, and Indications is not part of Contraindications.
 const alternatives=[...headings].sort((a,b)=>b.length-a.length).join('|');
 const expression=new RegExp('^[ \\t]*(?:#{1,6}[ \\t]*)?(?:\\*{1,2})?('+alternatives+')[ \\t]*(?:\\*{1,2})?(?::[ \\t]*(?:\\*{1,2})?|[ \\t]*\\r?$)','gmi');
 const marks=Array.from(text.matchAll(expression));
 return marks.map((mark,i)=>({key:headings.find(key=>key.toLowerCase()===mark[1].toLowerCase())!,text:text.slice(mark.index!+mark[0].length,marks[i+1]?.index??text.length).trim()})).filter(section=>section.text);
}
