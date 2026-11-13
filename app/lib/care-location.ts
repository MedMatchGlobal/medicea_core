export type CareLocationError='denied'|'timeout'|'unavailable';
export async function locateCare(geo:Pick<Geolocation,'getCurrentPosition'>,signal:AbortSignal):Promise<string>{
 if(signal.aborted)throw Error('cancelled');
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(Error('cancelled'));
  signal.addEventListener('abort',abort,{once:true});
  const finish=(error:string|null,value?:string)=>{signal.removeEventListener('abort',abort);if(signal.aborted)return reject(Error('cancelled'));error?reject(Error(error)):resolve(value!);};
  try{geo.getCurrentPosition(position=>{
   const {latitude,longitude}=position.coords;
   if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return finish('unavailable');
   finish(null,`${latitude},${longitude}`);
  },error=>finish(error.code===1?'denied':error.code===3?'timeout':'unavailable'),{enableHighAccuracy:true,maximumAge:0,timeout:8000});}catch{finish('unavailable');}
 });
}
