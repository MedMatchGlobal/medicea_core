import type {VeterinarySection} from './veterinary-sections';
import {medicineSources} from './medicine-evidence';
import {isMedicineName} from './match-display';
export const SAVED_SEARCH_KEY = 'medicea.saved-medicine-searches.v1';
export const MAX_SAVED_SEARCHES = 20;
export type SavedMode = 'international' | 'generic' | 'leaflet' | 'pets' | 'pet-generic';
export type SavedSearch = {
  id:string; savedAt:string; lang:string; mode:SavedMode; originCode:string; targetCode:string;
  selectedDrug:string; selectedDosage:string; result:string; leafletRaw:string;
  matches:{medicine_name:string;sources?:string[]}[]; petOriginIngredients:{name:string;strength:string}[];
  leaflets:Record<string,string>; petInformation:Record<string,VeterinarySection[]>;
  searchAccess?:string;
  originSources?:string[];
  originIngredients?:{name:string;strength:string}[];
  noExactMatch?:boolean;
};
export function isSavedMode(mode:string): mode is SavedMode {
  return ['international','generic','leaflet','pets','pet-generic'].includes(mode);
}
const text=(value:unknown,max=200000)=>typeof value==='string' ? value.slice(0,max) : '';
// Persist only explicit medicine-search fields; never capture account, location or condition data.
export function normalizeSavedSearch(value:unknown): SavedSearch | null {
  if (!value || typeof value!=='object') return null;
  const v=value as Record<string,any>;
  if (!isSavedMode(v.mode) || !text(v.id,100) || !text(v.selectedDrug,300) || !Number.isFinite(Date.parse(v.savedAt))) return null;
  const leaflets:Record<string,string>={};
  if (v.leaflets && typeof v.leaflets==='object') for (const [key,item] of Object.entries(v.leaflets).slice(0,30)) {
    if (typeof item==='string') Object.defineProperty(leaflets,key.slice(0,300),{value:text(item),enumerable:true});
  }
  const petInformation:Record<string,VeterinarySection[]>={};
  if (v.petInformation && typeof v.petInformation==='object') for (const [key,item] of Object.entries(v.petInformation).slice(0,30)) {
    if (Array.isArray(item)) Object.defineProperty(petInformation,key.slice(0,600),{value:item.filter(s=>s && typeof s.key==='string' && Array.isArray(s.bullets)).slice(0,20).map(s=>({key:text(s.key,80),bullets:s.bullets.filter((b:unknown)=>typeof b==='string').slice(0,30).map((b:string)=>text(b,2000))})),enumerable:true});
  }
  return {id:text(v.id,100),savedAt:new Date(v.savedAt).toISOString(),lang:/^[a-z]{2}$/.test(v.lang)?v.lang:'en',mode:v.mode,
    originCode:text(v.originCode,100),targetCode:text(v.targetCode,100),selectedDrug:text(v.selectedDrug,300),selectedDosage:text(v.selectedDosage,300),
    result:text(v.result),leafletRaw:text(v.leafletRaw),leaflets,petInformation,...(typeof v.searchAccess==='string'?{searchAccess:text(v.searchAccess,24000)}:{}),...(Array.isArray(v.originSources)?{originSources:medicineSources(v.originSources)}:{}),
    ...(v.noExactMatch===true?{noExactMatch:true}:{}),
    ...(Array.isArray(v.originIngredients)?{originIngredients:v.originIngredients.slice(0,20).map((i:any)=>({name:text(i?.name,300),strength:text(i?.strength,300)})).filter((i:any)=>i.name&&i.strength)}:{}),
    matches:Array.isArray(v.matches)?v.matches.slice(0,30).map((m:any)=>({medicine_name:text(m?.medicine_name ?? m?.Medicine_name,300),...(Array.isArray(m?.sources)?{sources:medicineSources(m.sources)}:{})})).filter((m:any)=>isMedicineName(m.medicine_name)):[],
    petOriginIngredients:Array.isArray(v.petOriginIngredients)?v.petOriginIngredients.slice(0,30).map((i:any)=>({name:text(i?.name,300),strength:text(i?.strength,300)})).filter((i:any)=>i.name):[]};
}
export function readSavedSearches(raw:string|null):SavedSearch[] {
  try {const values=JSON.parse(raw||'[]');return Array.isArray(values)?values.slice(0,MAX_SAVED_SEARCHES).map(normalizeSavedSearch).filter((v):v is SavedSearch=>!!v):[];} catch {return [];}
}
export function addSavedSearch(existing:SavedSearch[],entry:SavedSearch):SavedSearch[] {
  const normalized=normalizeSavedSearch(entry);
  if (!normalized) throw new Error('Invalid search');
  const same=(s:SavedSearch)=>s.mode===normalized.mode && s.lang===normalized.lang && s.originCode===normalized.originCode && s.targetCode===normalized.targetCode && s.selectedDrug===normalized.selectedDrug && s.selectedDosage===normalized.selectedDosage;
  const others=existing.filter(s=>!same(s));
  if (others.length>=MAX_SAVED_SEARCHES) throw new Error('Saved search limit');
  return [normalized,...others];
}
