import {ID} from './core.mjs';
import * as engine from './engine.mjs';
import {open,openMaster,refresh,notifyError} from './ui.mjs';
const ULT='telys-star-rail-ultimates';
function rootOf(app,html){return html?.jquery?html[0]:html instanceof HTMLElement?html:app.element?.jquery?app.element[0]:app.element;}
function injectHub(app,html){const root=rootOf(app,html),field=root?.querySelector('.tsru-phone-button-field');if(!field)return;
 if(!field.querySelector('[data-hub-action="tely-events"]')){const button=document.createElement('button');button.type='button';button.dataset.hubAction='tely-events';button.className='te-phone-button';const bottom=Math.max(0,...[...field.querySelectorAll('[data-hub-action]')].map(n=>n.offsetTop+n.offsetHeight));Object.assign(button.style,{position:'absolute',left:'12px',top:`${bottom+16}px`});field.style.minHeight=`${bottom+140}px`;button.innerHTML='<i class="fas fa-calendar-star"></i><span>Events</span>';field.append(button);}
 if(!field._telyEventsInstalled){field._telyEventsInstalled=true;field.addEventListener('click',e=>{if(!e.target.closest('[data-hub-action="tely-events"]'))return;e.preventDefault();e.stopImmediatePropagation();open();},true);}
}
function injectDesigner(app,html){if(app.options?.id!=='tsru-hub-config')return;const root=rootOf(app,html);for(const select of root?.querySelectorAll('[data-hub-button-action]')??[]){if(!select.querySelector('option[value="tely-events"]'))select.add(new Option('Events','tely-events'));const index=Number(select.name.match(/^buttons\.(\d+)\.action$/)?.[1]);if(app.buttonsDraft?.[index]?.action==='tely-events')select.value='tely-events';}}
function toolbar(controls){const group=Array.isArray(controls)?controls.find(c=>c.name==='tsru-hsr-hub'):controls['tsru-hsr-hub'];if(!group)return;const callback=()=>open(),tool={name:'tely-events',title:'Events',icon:'fas fa-calendar-days',button:true,visible:true,onClick:callback,onChange:callback};if(Array.isArray(group.tools)){if(!group.tools.some(t=>t.name===tool.name))group.tools.push(tool);}else group.tools[tool.name]=tool;}
class SettingsLauncher extends foundry.applications.api.ApplicationV2{render(){openMaster();return this;}}
Hooks.once('init',()=>{game.settings.register(ID,'database',{scope:'world',config:false,type:Object,default:{schema:1,events:[],progress:{},recipients:{},awards:{},receipts:{}},onChange:()=>{engine.resolvePending();refresh();}});game.settings.registerMenu(ID,'master',{name:"Telynor's Events Page",label:'Event Master Settings',hint:'Design events, customize rewards and manage each player’s progress.',icon:'fas fa-calendar-days',type:SettingsLauncher,restricted:true});});
Hooks.once('ready',()=>{window.TelyEvents={open,openMaster,register:engine.register,request:engine.request,modifyPlanarDrops:engine.modifyPlanarDrops,setProgress:engine.configureProgress,saveEvent:engine.saveEvent,getEvents:()=>engine.database().events};game.modules.get(ID).api=window.TelyEvents;Hooks.on('updateUser',engine.receiveUser);Hooks.on('userConnected',()=>engine.recoverRequests());engine.recoverRequests();
 // Register after the hub module so its consolidation does not erase our tool.
 Hooks.on('getSceneControlButtons',toolbar);ui.controls?.render({force:true});
 for(const app of Object.values(ui.windows??{})){injectHub(app,app.element);injectDesigner(app,app.element);}
});
Hooks.on('renderApplication',injectHub);Hooks.on('renderApplicationV2',injectHub);Hooks.on('renderApplication',injectDesigner);Hooks.on('renderApplicationV2',injectDesigner);
