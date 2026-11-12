import type {ExcipientComparison as Comparison,ExcipientEvidence} from '../lib/excipient-comparison';
export default function ExcipientComparison({comparison}:{comparison?:Comparison}) {
 if(!comparison)return <p>Excipient comparison unavailable for this result. Check the exact product leaflet with a pharmacist.</p>;
 const label={listed_match:'Listed excipients match',different:'Excipients differ',incomplete:'Excipient information incomplete'}[comparison.status];
 function evidence(title:string,e:ExcipientEvidence){return <section>
  <h4>{title}: {e.productName}</h4>
  <p>{e.status==='complete'?'Source reports a complete list':e.status==='partial'?'Partial list':'No supported list available'}{e.documentDate?` · Document date: ${e.documentDate}`:' · Document date unavailable'}</p>
  {!!e.items.length&&<ul>{e.items.map(i=><li key={i.name}>{i.name}{i.amount?` — ${i.amount}`:''}</li>)}</ul>}
  {!!e.sources.length&&<ul>{e.sources.map((url,i)=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer">Source {i+1}</a></li>)}</ul>}
 </section>;}
 return <div className="excipient-comparison" style={{margin:'12px 0',padding:'12px 0',borderTop:'1px solid #d9d3c8'}}>
  <p><strong>Active ingredients and strengths:</strong> match. <strong>Form, route and release:</strong> match under the medicine comparison rules.</p>
  <p><strong>{label}</strong></p>
  {comparison.status==='incomplete'&&<p>Missing information does not mean an ingredient is absent.</p>}
  {comparison.status==='listed_match'&&<p>The declared ingredient names match. This does not establish an identical formulation or individual tolerability.</p>}
  <p>{comparison.amounts==='unknown'?'Excipient quantities have not been fully compared.':comparison.amounts==='different'?'Differences in declared excipient quantities were found.':'The available declared excipient quantities match.'}</p>
  {!!comparison.originOnly.length&&<p><strong>Listed only in the origin record:</strong> {comparison.originOnly.join(', ')}.</p>}
  {!!comparison.candidateOnly.length&&<p><strong>Listed only in this candidate record:</strong> {comparison.candidateOnly.join(', ')}.</p>}
  {!!comparison.amountDifferences.length&&<p><strong>Different declared quantities:</strong> {comparison.amountDifferences.join(', ')}.</p>}
  <details><summary>View ingredient lists and evidence</summary>
   {evidence('Origin medicine',comparison.origin)}{evidence('This medicine',comparison.candidate)}
   <p>Compared: {comparison.checkedAt.slice(0,10)}. This is a source-linked comparison, not a regulatory bioequivalence assessment. Formulations can change.</p>
  </details>
  <p>Tell the pharmacist about allergies or intolerances before choosing a product.</p>
 </div>;
}
