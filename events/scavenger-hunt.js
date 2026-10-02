// Add this world-relative .js path to a custom event's Script field.
TelyEvents.register('scavenger-hunt', {
 title:'Scavenger Hunt',
 build:()=>[
  {id:'clue-1',title:'Find the first clue',target:1,rewards:[]},
  {id:'clue-2',title:'Find the second clue',target:1,requires:['clue-1'],rewards:[]},
  {id:'treasure',title:'Discover the treasure',target:1,requires:['clue-2'],rewards:[]}
 ],
 render:({root,event,progress})=>{
  const p=document.createElement('p');p.textContent='Explore the world and ask your GM to record each clue. Your discoveries are saved separately.';root.append(p);
 },
 // Runs on the elected GM only; ignore arbitrary client-supplied assertions.
 action:async({action,event,context})=>{if(action==='found-clue')throw Error('This hunt requires GM confirmation of discoveries.');},
 mount:()=>()=>{} // Return cleanup function for timers/listeners if needed.
});
