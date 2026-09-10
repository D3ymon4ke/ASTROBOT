import React from 'react';
import { Layers, Activity, CalendarDays, BookOpen, BarChart3, Send, ShieldCheck } from 'lucide-react';
import './Navigation.css';
export default function Navigation({page,onNavigate,admin}) {
 const items=[['dashboard','Dashboard',Layers],['validator','Análise',Activity],['automation','Automação',CalendarDays],['strategies','Estratégias',BookOpen],['reports','Relatórios',BarChart3],['telegram','Telegram',Send],...(admin?[['admin','Admin',ShieldCheck]]:[])];
 return <nav className="desktop-nav-links app-navigation" aria-label="Navegação principal">{items.map(([id,label,Icon])=><button key={id} aria-current={page===id?'page':undefined} onClick={()=>onNavigate(id)}><Icon size={15}/><span>{label}</span></button>)}</nav>;
}
