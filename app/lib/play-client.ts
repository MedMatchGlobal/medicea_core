import {registerPlugin} from '@capacitor/core';
export type NativePurchase={token:string;products:string[];state:number};
export type NativeOffer={product:string;type:string;basePlan?:string;offerToken:string;price:string};
export const PlayBilling=registerPlugin<{
 products(options:{items:{product:string;type:string}[]}):Promise<{offers:NativeOffer[]}>;
 purchase(options:{product:string;type:string;offerToken:string;account:string}):Promise<{purchases:NativePurchase[]}>;
 restore():Promise<{purchases:NativePurchase[]}>;
}>('PlayBilling');
