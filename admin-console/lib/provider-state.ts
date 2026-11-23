export function providerState(provider:{available?:boolean;state?:string}){
 return provider.available?'ready':provider.state==='not_linked'?'not_linked':'unavailable';
}
export function providerEmptyText(provider:{available?:boolean;state?:string},section:'future'|'payments'|'contact'){
 const state=providerState(provider);
 if(state==='not_linked')return 'No Stripe billing account is linked to this account.';
 if(state==='unavailable')return section==='future'?'Future plans could not be checked.':section==='payments'?'Purchase history could not be loaded.':'Billing contact details could not be loaded.';
 return section==='future'?'No future Stripe plan found.':section==='payments'?'No Stripe charges to display.':'Billing contact details have not been supplied.';
}
