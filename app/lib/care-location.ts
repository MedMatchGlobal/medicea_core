export type CareLocationError='denied'|'timeout'|'unavailable';
const MAX_NEARBY_ACCURACY_METRES=1000;
/** A recent device fix can avoid a slow cold GPS start. Reject coarse positions
 * rather than sending a city/region-sized guess to the nearby search. */
export async function locateCare(geo:Pick<Geolocation,'getCurrentPosition'>,signal:AbortSignal):Promise<string>{
 function request(options:PositionOptions):Promise<string>{
  if(signal.aborted)return Promise.reject(Error('cancelled'));
  return new Promise((resolve,reject)=>{
   let settled=false;
   const finish=(error:string|null,value?:string)=>{if(settled)return;settled=true;signal.removeEventListener('abort',abort);if(signal.aborted)return reject(Error('cancelled'));error?reject(Error(error)):resolve(value!);};
   const abort=()=>finish('cancelled');
   signal.addEventListener('abort',abort,{once:true});
   try{geo.getCurrentPosition(position=>{
    const {latitude,longitude,accuracy}=position.coords;
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||!Number.isFinite(accuracy)||accuracy<0||accuracy>MAX_NEARBY_ACCURACY_METRES)return finish('unavailable');
    finish(null,`${latitude},${longitude}`);
   },error=>finish(error.code===1?'denied':error.code===3?'timeout':'unavailable'),options);}catch{finish('unavailable');}
  });
 }
 try{return await request({enableHighAccuracy:false,maximumAge:30000,timeout:5000});}
 catch(error){
  if(signal.aborted||(error instanceof Error&&['denied','cancelled'].includes(error.message)))throw error;
  return request({enableHighAccuracy:true,maximumAge:0,timeout:15000});
 }
}
