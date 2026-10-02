import {ID,clone,active,stateFor,unlocked,checkIn,validateEvent,multiplier,integer} from './core.mjs';
export const definitions=new Map(),pending=new Map();let queue=Promise.resolve();
export const database=()=>clone(game.settings.get(ID,'database'));
export const authority=()=>game.users.filter(u=>u.active&&u.isGM).sort((a,b)=>a.id.localeCompare(b.id))[0];
export const isAuthority=()=>authority()?.id===game.user.id;
export function register(id,def){if(!id||typeof def!=='object')throw Error('Invalid event plugin.');definitions.set(id,def);}
export async function loadScript(event){
 if(!event.script)return null;
 const path=String(event.script);if(!/\.m?js(?:\?.*)?$/i.test(path)||/^(?:[a-z]+:|\/\/)/i.test(path)||path.includes('..'))throw Error('Use a world-relative .js or .mjs path.');
 const module=await import('/'+path.replace(/^\//,''));if(module.default)register(event.pluginId||event.id,module.default);
 return definitions.get(event.pluginId||event.id)??definitions.get(path.split('/').pop().replace(/\.m?js(?:\?.*)?$/,''))??null;
}
function enqueue(fn){const next=queue.then(fn);queue=next.catch(console.error);return next;}
function requireWriter(){if(!game.user.isGM)throw Error('GM only.');if(!isAuthority())throw Error('Open Event Master Settings on the elected active GM: '+(authority()?.name||authority()?.id||'none')+'.');}
export async function saveEvent(event){requireWriter();validateEvent(event);return enqueue(async()=>{const db=database(),idx=db.events.findIndex(e=>e.id===event.id);if(idx<0)db.events.push(clone(event));else db.events[idx]=clone(event);await game.settings.set(ID,'database',db);});}
export async function deleteEvent(id){requireWriter();return enqueue(async()=>{const db=database();db.events=db.events.filter(e=>e.id!==id);delete db.progress[id];await game.settings.set(ID,'database',db);});}
export async function configureProgress(eventId,userId,itemId,value){
 requireWriter();return enqueue(async()=>{const db=database(),e=db.events.find(e=>e.id===eventId),i=e?.items.find(i=>i.id===itemId);if(!i)throw Error('Objective not found.');integer(value);db.progress[eventId]??={};const p=db.progress[eventId][userId]??={items:{},days:0};p.items[itemId]={...(p.items[itemId]??{}),value,complete:value>=i.target};if(e.kind==='checkin'){p.days=0;for(const day of e.items){if(!p.items[day.id]?.complete)break;p.days++;}}await game.settings.set(ID,'database',db);});
}
export async function chooseRecipient(userId,actorId){requireWriter();const user=game.users.get(userId),actor=game.actors.get(actorId);if(!user||!actor?.testUserPermission(user,'OWNER'))throw Error('Choose a character owned by that player.');return enqueue(async()=>{const db=database();db.recipients[userId]=actorId;await game.settings.set(ID,'database',db);});}
function recipient(db,user){const id=db.recipients[user.id]??user.character?.id;const actor=game.actors.get(id);if(!actor||!actor.testUserPermission(user,'OWNER'))throw Error(`Assign an owned reward character for ${user.name} in Event Master Settings.`);return actor;}
export async function request(op,eventId,itemId='',data={}){
 const user=game.user;if(!authority())throw Error('An active GM is required.');
 const packet={id:foundry.utils.randomID(24),op,eventId,itemId,data};
 if(isAuthority())return enqueue(()=>process(user,packet));
 if(pending.has(user.id))throw Error('Wait for your previous event request.');
 return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{pending.delete(user.id);reject(Error('GM did not respond. The request may still complete; reopen Events before retrying.'));},30000);pending.set(user.id,{id:packet.id,resolve,reject,timeout});user.setFlag(ID,'request',packet).catch(error=>{clearTimeout(timeout);pending.delete(user.id);reject(error)});});
}
async function award(db,e,user,item){
 const p=db.progress[e.id][user.id],s=p.items[item.id];if(!s?.complete)throw Error('Objective is incomplete.');if(s.claimed)return;
 // Persist each prepared award before touching the actor. Item flags allow recovery
 // after a GM disconnect between creation and marking the reward delivered.
 const ledgerKey=`${e.id}:${user.id}:${item.id}`;
 let ledger=db.awards[ledgerKey];
 if(!ledger){const actor=recipient(db,user),rewards=[];for(const r of item.rewards??[]){const doc=await fromUuid(r.uuid);if(doc?.documentName!=='Item')throw Error(`Reward Item not found: ${r.name||r.uuid}`);const source=doc.toObject();delete source._id;source.system??={};const amount=integer(r.amount,1,10000);if(typeof doc.system?.quantity==='number'){source.system.quantity=amount;rewards.push(source);}else for(let n=0;n<amount;n++)rewards.push(clone(source));}
 ledger=db.awards[ledgerKey]={actorId:actor.id,rewards,delivered:[],created:Date.now()};await game.settings.set(ID,'database',db);}
 const actor=game.actors.get(ledger.actorId);if(!actor)throw Error('Reward recipient was deleted.');
 for(let n=0;n<ledger.rewards.length;n++){
  if(ledger.delivered.includes(n))continue;const key=`${ledgerKey}:${n}`;
  if(!actor.items.some(i=>i.getFlag(ID,'awardKey')===key)){const source=clone(ledger.rewards[n]);source.flags??={};source.flags[ID]={...(source.flags[ID]??{}),awardKey:key};await actor.createEmbeddedDocuments('Item',[source]);}
  ledger.delivered.push(n);await game.settings.set(ID,'database',db);
 }
 s.claimed=true;s.claimedAt=Date.now();await game.settings.set(ID,'database',db);
}
async function process(user,packet){
 let db=database();if(db.receipts[packet.id])return db.receipts[packet.id];
 try{
  const e=db.events.find(e=>e.id===packet.eventId);if(!e)throw Error('Event not found.');
  if(!active(e)&&!user.isGM)throw Error('Event is not open.');if(e.eligible?.length&&!e.eligible.includes(user.id)&&!user.isGM)throw Error('You are not eligible for this event.');
  db.progress[e.id]??={};const p=db.progress[e.id][user.id]??={items:{},days:0};
  if(packet.op==='checkin'){if(e.kind!=='checkin')throw Error('This is not a check-in event.');checkIn(e,p);await game.settings.set(ID,'database',db);}
  else if(packet.op==='claim'){
   const item=e.items.find(i=>i.id===packet.itemId);if(!item)throw Error('Objective not found.');if(!unlocked(e,item,p))throw Error('Finish prerequisites first.');await award(db,e,user,item);
  }else if(packet.op==='custom'){
   const def=await loadScript(e);if(!def?.action)throw Error('Event plugin has no action handler.');
   await def.action({event:clone(e),progress:clone(p),user,action:String(packet.data.action||''),data:clone(packet.data.payload??{}),context:{requestId:packet.id,setProgress:(itemId,value)=>{const i=e.items.find(x=>x.id===itemId);if(!i)throw Error('Unknown objective.');integer(value);if(!unlocked(e,i,p))throw Error('Prerequisites incomplete.');p.items[itemId]={...(p.items[itemId]??{}),value,complete:value>=i.target};}}});await game.settings.set(ID,'database',db);
  }else throw Error('Unknown event request.');
  db.receipts[packet.id]={ok:true};
 }catch(error){console.error(ID,error);db=database();db.receipts[packet.id]={ok:false,error:error.message};}
 // Receipts retained to make reconnection/replayed updateUser requests idempotent.
 await game.settings.set(ID,'database',db);const result=db.receipts[packet.id];if(!result.ok)throw Error(result.error);return result;
}
export async function awardMany(eventId,userIds,itemIds){requireWriter();const errors=[];for(const uid of userIds)for(const iid of itemIds){try{await enqueue(async()=>{const db=database(),e=db.events.find(x=>x.id===eventId),user=game.users.get(uid),item=e?.items.find(x=>x.id===iid);if(!e||!user||!item)throw Error('Player or objective missing.');if(stateFor(db,eventId,uid).items[iid]?.complete)await award(db,e,user,item);});}catch(error){errors.push(`${game.users.get(uid)?.name}: ${error.message}`)}}return errors;}
export function receiveUser(user,changes){if(!isAuthority())return;const packet=foundry.utils.getProperty(changes,`flags.${ID}.request`);if(packet?.id)enqueue(()=>process(user,packet)).catch(console.error);}
export function resolvePending(){const db=database();for(const [uid,p]of pending){const receipt=db.receipts[p.id];if(!receipt)continue;clearTimeout(p.timeout);pending.delete(uid);receipt.ok?p.resolve(receipt):p.reject(Error(receipt.error));}}
export async function recoverRequests(){if(!isAuthority())return;for(const user of game.users){const req=user.getFlag(ID,'request');if(req?.id&&!database().receipts[req.id])enqueue(()=>process(user,req)).catch(console.error);}}
export async function modifyPlanarDrops(entries,{userId,reroll}={}){
 if(!game.user.isGM)throw Error('Only the GM can generate planar drops.');const factor=multiplier(database().events,userId);const output=[];
 for(const entry of entries)for(let i=0;i<factor;i++){const copy=clone(entry);if(i){copy.id=foundry.utils.randomID();if(reroll)copy.relic=await reroll(entry);}copy.flags={...(copy.flags??{}),[ID]:{multiplier:factor,baseId:entry.id}};output.push(copy);}return output;
}
