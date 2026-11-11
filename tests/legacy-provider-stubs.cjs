module.exports=name=>{
 if(name.endsWith('/claude-preview')||name==='./claude-preview')return {claudePreviewEnabled:()=>false};
 if(name.endsWith('/sonnet-research-support')||name==='./sonnet-research-support')return {readOriginSelection:()=>null};
 if(name.endsWith('/sonnet-research-matches'))return {productionStrengthSearch:()=>{throw Error('Unexpected restored provider in legacy fixture');}};
};
