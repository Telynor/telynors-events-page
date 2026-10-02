export const ID='telynors-events-page';
export const clone=x=>structuredClone(x);
export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function integer(x,min=0,max=1000000){const n=Number(x);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error(`Enter an integer from ${min} to ${max}.`);return n}
export const sorted=events=>[...events].sort((a,b)=>Number(b.priority)-Number(a.priority)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
export function active(e,now=Date.now()){return e.status==='open'&&(!e.start||now>=Date.parse(e.start))&&(!e.end||now<Date.parse(e.end))}
export function dayKey(now,timezone='America/New_York',resetHour=0){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
 const date=new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00Z`);if(Number(parts.hour)<resetHour)date.setUTCDate(date.getUTCDate()-1);return date.toISOString().slice(0,10);
}
export function stateFor(db,eventId,userId){return db.progress?.[eventId]?.[userId]??{items:{},lastCheckin:null,days:0}}
export function unlocked(event,item,progress){return (item.requires??[]).every(id=>progress.items?.[id]?.complete)&&(!event.sequential||event.items.slice(0,event.items.indexOf(item)).every(x=>progress.items?.[x.id]?.complete))}
export function freshEvent(id){return {id,title:'New Event',priority:0,status:'draft',kind:'objectives',description:'',information:'',thumbnail:'',background:'',foreground:'',rewardFrame:'',pageBackground:'',accent:'#e7c578',textColor:'#ffffff',overlay:0.55,backgroundX:50,backgroundY:50,artX:35,artY:55,artWidth:45,panelX:67,panelY:18,panelWidth:30,columns:3,start:'',end:'',timezone:'America/New_York',resetHour:4,sequential:false,script:'',dropMultiplier:1,items:[]}}
export function validateEvent(e){
 if(!e.id||!String(e.title).trim())throw Error('Event needs an ID and title.');integer(e.priority,-1000000000,1000000000);
 if(!['draft','open','archived'].includes(e.status)||!['objectives','checkin','custom'].includes(e.kind))throw Error('Unknown event status or layout.');
 for(const key of ['start','end'])if(e[key]&&!Number.isFinite(Date.parse(e[key])))throw Error(`Invalid ${key} date.`);
 if(e.start&&e.end&&Date.parse(e.end)<=Date.parse(e.start))throw Error('End date must follow start date.');
 for(const key of ['backgroundX','backgroundY','artX','artY','artWidth','panelX','panelY','panelWidth'])if(!Number.isFinite(Number(e[key]))||Number(e[key])<0||Number(e[key])>100)throw Error('Layout percentages must be 0–100.');if(!Number.isFinite(Number(e.overlay))||e.overlay<0||e.overlay>1)throw Error('Darkening must be 0–1.');for(const color of [e.accent,e.textColor])if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('Use six-digit hex colors.');dayKey(Date.now(),e.timezone,e.resetHour);integer(e.resetHour,0,23);integer(e.columns,1,8);integer(e.dropMultiplier,1,100);
 const ids=new Set();for(const i of e.items){if(!i.id||ids.has(i.id))throw Error('Objective IDs must be unique.');ids.add(i.id);integer(i.target,1);for(const r of i.rewards??[]){if(!r.uuid)throw Error('Reward needs an Item UUID.');integer(r.amount,1,10000);}}
 for(const i of e.items)for(const id of i.requires??[])if(!ids.has(id)||id===i.id)throw Error('Invalid prerequisite objective.');
 const visited=new Set(),stack=new Set();function visit(id){if(stack.has(id))throw Error('Objective prerequisites contain a cycle.');if(visited.has(id))return;stack.add(id);for(const dep of e.items.find(i=>i.id===id).requires??[])visit(dep);stack.delete(id);visited.add(id)}for(const id of ids)visit(id);
 return e;
}
export function checkIn(event,p,now=Date.now()){
 const day=dayKey(now,event.timezone,event.resetHour);if(p.lastCheckin===day)throw Error('You already checked in today.');
 const item=event.items[p.days??0];if(!item)throw Error('All check-in days are complete.');
 p.items??={};p.items[item.id]={...(p.items[item.id]??{}),value:item.target,complete:true};p.lastCheckin=day;p.days=(p.days??0)+1;return item;
}
export function multiplier(events,userId,now=Date.now()){return Math.max(1,...events.filter(e=>active(e,now)&&(!e.eligible?.length||e.eligible.includes(userId))).map(e=>e.dropMultiplier??1))}
