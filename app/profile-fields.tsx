'use client';
import {useState} from 'react';
import {Command,CommandInput,CommandList,CommandItem,CommandEmpty} from '@/components/ui/command';
import {Checkbox} from '@/components/ui/checkbox';
import {Popover,PopoverTrigger,PopoverContent} from '@/components/ui/popover';
import cities from '@/lib/cities.json';
import {STACK_GROUPS,STACK_OPTIONS} from '@/lib/profile-options';
const normalize=(value:string)=>value.toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
export function CityField({value,onChange}:{value:string;onChange:(city:string)=>void}){
 const [open,setOpen]=useState(false);
 const query=normalize(value),words=query.split(/\s+/).filter(Boolean);
 const matches=cities.filter(city=>words.every(word=>normalize(`${city.name}, ${city.region}`).includes(word))).sort((a,b)=>Number(normalize(b.name).startsWith(query))-Number(normalize(a.name).startsWith(query))||a.name.localeCompare(b.name,'ru'));
 return <div className="field city-field"><label htmlFor="profile-city">Город</label><Command shouldFilter={false} className="city-command" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}><CommandInput id="profile-city" aria-label="Город" placeholder="Начните вводить город или регион" value={value} onValueChange={v=>{onChange(v);setOpen(true);}} onFocus={()=>setOpen(true)}/>{open&&<CommandList aria-label="Города России" className="city-results"><CommandEmpty>Город не найден. Проверьте название.</CommandEmpty>{matches.slice(0,30).map(city=>{const label=`${city.name}, ${city.region}`;return <CommandItem key={label} value={label} onMouseDown={e=>e.preventDefault()} onSelect={()=>{onChange(label);setOpen(false);}}><span>{city.name}</span><small>{city.region}</small></CommandItem>;})}{matches.length>30&&<p className="city-hint">Найдено {matches.length}. Уточните название города или региона.</p>}</CommandList>}</Command><small className="field-hint">Выберите город из подсказок.</small></div>;
}
export function StackField({value,onChange,label='Технологии и инструменты'}:{value:string[];onChange:(stack:string[])=>void;label?:string}){
 const [query,setQuery]=useState('');
 const extras=value.filter(item=>!STACK_OPTIONS.includes(item));
 const groups=[...STACK_GROUPS,...(extras.length?[{name:'Ранее добавленные навыки',items:extras}]:[])];
 const filtered=groups.map(group=>({...group,items:group.items.filter(item=>normalize(item).includes(normalize(query)))})).filter(group=>group.items.length);
 return <fieldset className="stack-field"><legend>{label} <span>Выбрано: {value.length}</span></legend><input aria-label="Поиск технологии" placeholder="Найти технологию" value={query} onChange={e=>setQuery(e.target.value)}/><div className="stack-groups">{filtered.map(group=><section key={group.name}><h3>{group.name}</h3><div className="stack-options">{group.items.map(item=><label className={'stack-option'+(value.includes(item)?' selected':'')} key={item}><Checkbox checked={value.includes(item)} onCheckedChange={checked=>onChange(checked===true?[...new Set([...value,item])]:value.filter(v=>v!==item))}/><span>{item}</span></label>)}</div></section>)}{!filtered.length&&<p>Технология не найдена.</p>}</div></fieldset>;
}
export function StackFilter({value,onChange}:{value:string[];onChange:(stack:string[])=>void}){
 return <div className="field"><span>Необходимый стек</span><Popover><PopoverTrigger asChild><button type="button" className="stack-filter-trigger" aria-label="Выбрать необходимый стек">{value.length?value.slice(0,2).join(', ')+(value.length>2?` +${value.length-2}`:''):'Любой стек'}</button></PopoverTrigger><PopoverContent className="stack-filter-popover" align="start"><StackField label="Необходимый стек" value={value} onChange={onChange}/><button type="button" className="secondary" onClick={()=>onChange([])}>Снять все отметки</button></PopoverContent></Popover></div>;
}
