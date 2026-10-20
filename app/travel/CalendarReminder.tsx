'use client';
import {useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {travelNextCopy} from '../i18n/travel-next';
import {travelCopy} from '../i18n/travel-demo';
import {tripCalendar} from '../lib/travel-calendar';
import type {DemoTrip} from '../lib/travel-demo';
export default function CalendarReminder({trip,lang}:{trip:DemoTrip;lang:string}){
 const [time,setTime]=useState('09:00'),[invalid,setInvalid]=useState(false),c=travelCopy(lang),n=travelNextCopy(lang);
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 function download(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const local=`${trip.start}T${time}:00`,departure=new Date(local);
  // Reject a missing clock time (for example a skipped hour at the DST boundary).
  if(!Number.isFinite(departure.getTime())||departure.getFullYear()!==Number(trip.start.slice(0,4))||departure.getMonth()+1!==Number(trip.start.slice(5,7))||departure.getDate()!==Number(trip.start.slice(8,10))||departure.getHours()!==Number(time.slice(0,2))||departure.getMinutes()!==Number(time.slice(3,5))){setInvalid(true);return;}
  setInvalid(false);const url=URL.createObjectURL(new Blob([tripCalendar(trip,departure.toISOString(),c.checklist,c.tripPack)],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`medicea-reminder-${trip.start}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <form className="travel-reminder" onSubmit={download}><h3><CalendarDays size={19} aria-hidden="true"/> {n.calendar}</h3><p>{n.calendarNote}</p><label>{n.departureTime}<span>{trip.start} · {zone}</span><input type="time" required value={time} onChange={e=>{setTime(e.target.value);setInvalid(false);}}/></label>{invalid&&<p role="alert">{c.invalidDates}</p>}<button className="travel-secondary" type="submit">{n.calendar} (.ics)</button></form>;
}
