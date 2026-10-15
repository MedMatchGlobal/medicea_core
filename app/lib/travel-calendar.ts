import {validTrip,type DemoTrip} from './travel-demo';

// RFC 5545 TEXT escaping and UTF-8 octet folding, including non-Latin titles.
function text(value:string){return value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function fold(line:string){let result='',part='';for(const char of line){if(new TextEncoder().encode(part+char).length>75){result+=part+'\r\n';part=' ';}part+=char;}return result+part;}
export function tripCalendar(trip:DemoTrip,departureISO:string,title:string,description:string,now=new Date()){
 const departure=new Date(departureISO),day=Date.parse(trip.start+'T00:00:00Z');
 if(!validTrip(trip)||!Number.isFinite(departure.getTime())||Math.abs(departure.getTime()-day)>2*86400000)throw Error('Invalid departure');
 const stamp=(d:Date)=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//medicea//Travel Preview//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:travel-${trip.id}@medicea.global`,`DTSTAMP:${stamp(now)}`,`DTSTART:${stamp(departure)}`,`DTEND:${stamp(new Date(departure.getTime()+30*60000))}`,`SUMMARY:${text('medicéa · '+title)}`,`DESCRIPTION:${text(description)}`,'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT48H',`DESCRIPTION:${text('medicéa · '+title)}`,'END:VALARM','END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
