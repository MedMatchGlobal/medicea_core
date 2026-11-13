'use client';
import {useCallback,useEffect,useState} from 'react';
import {locateCare,type CareLocationError} from '../lib/care-location';
export function useCareLocation(enabled:boolean){
 const [attempt,setAttempt]=useState(0);
 const [state,setState]=useState<{coordinates:string;pending:boolean;error:CareLocationError|null}>({coordinates:'',pending:false,error:null});
 useEffect(()=>{
  if(!enabled){setState({coordinates:'',pending:false,error:null});return;}
  const controller=new AbortController();
  setState({coordinates:'',pending:true,error:null});
  if(!navigator.geolocation){setState({coordinates:'',pending:false,error:'unavailable'});return;}
  locateCare(navigator.geolocation,controller.signal).then(coordinates=>{if(!controller.signal.aborted)setState({coordinates,pending:false,error:null});},error=>{
   if(!controller.signal.aborted)setState({coordinates:'',pending:false,error:['denied','timeout'].includes(error.message)?error.message:'unavailable'});
  });return()=>controller.abort();
 },[enabled,attempt]);
 const retry=useCallback(()=>{setState({coordinates:'',pending:true,error:null});setAttempt(value=>value+1);},[]);
 // Hiding the previous fix immediately also prevents a stale callback being used after toggling.
 return enabled?{...state,pending:state.pending||(!state.coordinates&&!state.error),retry}:{coordinates:'',pending:false,error:null,retry};
}
