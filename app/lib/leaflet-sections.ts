const headings=['Summary','Manufacturer','Description','Overview','What it is','Active Ingredient','Active Ingredients','Mechanism of Action','How it Works','Uses','Indications','Posology','Strength','Formulation','Dosage','Interactions','Side Effects','Precautions','Contraindications','Warnings','Legal Classification','Storage','Indicative Retail Prices','Note','Disclaimer'];
export function leafletSections(text:string){
 // Section labels must start a line. A mention of manufacturer/regulator in
 // prose is not a heading, and Indications is not part of Contraindications.
 const aliases:Record<string,string>={'Indicative selling price':'Indicative Retail Prices','Average Selling Price':'Indicative Retail Prices','Indicative retail price':'Indicative Retail Prices','Strength(s)':'Strength','Strengths':'Strength','Formulations(s)':'Formulation','Formulation(s)':'Formulation','Formulations':'Formulation','Dosage(s)':'Dosage','Dosages':'Dosage','Contraindications (including allergy warnings)':'Contraindications','Sources':'Sources'};
 const labels=[...headings,...Object.keys(aliases)];
 const alternatives=labels.sort((a,b)=>b.length-a.length).map(label=>label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 const expression=new RegExp('^[ \\t]*(?:#{1,6}[ \\t]*)?(?:\\*{1,2})?('+alternatives+')(?:[ \\t]*\\([^\\r\\n]*\\))?[ \\t]*(?:\\*{1,2})?(?::[ \\t]*(?:\\*{1,2})?|[ \\t]*\\r?$)','gmi');
 const marks=Array.from(text.matchAll(expression));
 return marks.map((mark,i)=>{const label=labels.find(key=>key.toLowerCase()===mark[1].toLowerCase())!;return {key:aliases[label]||label,text:text.slice(mark.index!+mark[0].length,marks[i+1]?.index??text.length).trim()};}).filter(section=>section.text);
}
