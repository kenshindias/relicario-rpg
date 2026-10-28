import { useState } from 'react'
import { BookMarked, Check, ChevronDown, CirclePlus, Heart, Pencil, Shield, Sparkles, Swords, Wallet } from 'lucide-react'
import { ABILITIES, SKILLS, mod, signed, proficiency, skillBonus, passivePerception, defaultSheet } from './characterRules'

const MODES = [{value:'none',label:'Sem proficiência'},{value:'proficient',label:'Proficiente'},{value:'expertise',label:'Especialista (2×)'}]
const chunk = (text) => (text||'').trim()

function Field({label,children}){return <label className="character-field"><span>{label}</span>{children}</label>}
function LargeText({label,value,onChange,rows=3,maxLength=4000}){
  return <Field label={label}><textarea rows={rows} maxLength={maxLength} value={value||''} onChange={e=>onChange(e.target.value)} /></Field>
}
function ReadText({title,value}) {return <section className="character-lore"><h4>{title}</h4><p>{chunk(value)||'—'}</p></section>}

function Editor({sheet,busy,onSave,onCancel}){
  const [form,setForm]=useState(()=>({ ...sheet, abilities:{...sheet.abilities}, save_proficiencies:{...sheet.save_proficiencies}, skill_proficiencies:{...sheet.skill_proficiencies} }))
  const field=(key,value)=>setForm(s=>({...s,[key]:value}))
  const ability=(key,value)=>setForm(s=>({...s,abilities:{...s.abilities,[key]:value}}))
  const saveProf=(key,checked)=>setForm(s=>({...s,save_proficiencies:{...s.save_proficiencies,[key]:checked}}))
  const skillRank=(key,value)=>setForm(s=>({...s,skill_proficiencies:{...s.skill_proficiencies,[key]:value}}))
  const num=(key,opts={})=><input type="number" step="1" min={opts.min??0} max={opts.max??99999} value={form[key]??''} onChange={e=>field(key,e.target.value)} required />
  const str=(key,maxLength=120)=><input maxLength={maxLength} value={form[key]||''} onChange={e=>field(key,e.target.value)} />
  return <form className="character-editor" onSubmit={e=>{e.preventDefault();onSave(form)}}>
    <div className="character-editor-header"><div><span className="eyebrow">FICHA DO AVENTUREIRO</span><h3>Editar personagem</h3><p>Altere os campos e salve ao final. Os valores derivados são recalculados automaticamente.</p></div><button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button></div>
    <section className="character-edit-section"><h4>Identidade</h4><div className="character-edit-grid">
      <Field label="Nome do personagem"><input autoFocus maxLength={120} value={form.name||''} onChange={e=>field('name',e.target.value)} required /></Field>
      <Field label="Classe(s)">{str('class_name',160)}</Field>
      <Field label="Subclasse">{str('subclass')}</Field>
      <Field label="Espécie / linhagem">{str('species')}</Field>
      <Field label="Antecedente">{str('background')}</Field>
      <Field label="Tendência">{str('alignment',80)}</Field>
      <Field label="Nível total">{num('level',{min:1,max:20})}</Field>
      <Field label="Pontos de experiência">{num('experience',{max:100000000})}</Field>
      <Field label="Bônus de proficiência especial (opcional)"><input type="number" min="0" max="20" step="1" value={form.proficiency_override??''} onChange={e=>field('proficiency_override',e.target.value)} placeholder="Automático" /></Field>
      <label className="character-check"><input type="checkbox" checked={!!form.inspiration} onChange={e=>field('inspiration',e.target.checked)}/> Inspiração</label>
    </div></section>
    <section className="character-edit-section"><h4>Atributos & resistência</h4><div className="character-ability-editor">{ABILITIES.map(a=><div className="character-ability-input" key={a.key}>
      <span>{a.short}</span><input type="number" min="1" max="30" step="1" value={form.abilities[a.key]??10} onChange={e=>ability(a.key,e.target.value)} required/>
      <small>{signed(mod(form.abilities[a.key]||10))}</small>
      <label><input type="checkbox" checked={!!form.save_proficiencies[a.key]} onChange={e=>saveProf(a.key,e.target.checked)} /> Resist.</label>
    </div>)}</div></section>
    <section className="character-edit-section"><h4>Perícias</h4><p className="character-muted">Proficiência soma o bônus uma vez. Especialização soma duas vezes.</p>
      <div className="character-skill-editor">{SKILLS.map(([skill,key])=><label key={skill}><span>{skill}</span><select value={form.skill_proficiencies[skill]||'none'} onChange={e=>skillRank(skill,e.target.value)}>{MODES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>)}</div>
    </section>
    <section className="character-edit-section"><h4>Combate & condições</h4><div className="character-edit-grid">
      <Field label="Classe de Armadura">{num('armor_class',{max:99})}</Field><Field label="Deslocamento (m)">{num('speed',{max:999})}</Field>
      <Field label="Bônus adicional de iniciativa"><input type="number" min="-99" max="99" step="1" value={form.initiative_bonus} onChange={e=>field('initiative_bonus',e.target.value)} required /></Field>
      <Field label="PV máximos">{num('hp_max',{min:1})}</Field><Field label="PV atuais">{num('hp_current')}</Field><Field label="PV temporários">{num('hp_temp')}</Field>
      <Field label="Dados de vida">{str('hit_dice',60)}</Field><Field label="Dados de vida gastos">{num('hit_dice_spent',{max:999})}</Field>
      <Field label="Salvaguardas contra morte (sucessos)">{num('death_successes',{max:3})}</Field><Field label="Salvaguardas contra morte (falhas)">{num('death_failures',{max:3})}</Field>
    </div><LargeText label="Condições e efeitos" value={form.conditions} onChange={v=>field('conditions',v)} rows={2} maxLength={1200}/></section>
    <section className="character-edit-section"><h4>Características, ataques e história</h4>
      <LargeText label="Ataques, dano e truques de combate" value={form.attacks} onChange={v=>field('attacks',v)} maxLength={4000}/>
      <LargeText label="Proficiências em armas, armaduras, ferramentas e idiomas" value={form.proficiencies} onChange={v=>field('proficiencies',v)} maxLength={4000}/>
      <LargeText label="Características de classe, espécie e talentos" value={form.features} onChange={v=>field('features',v)} rows={5} maxLength={10000}/>
      <LargeText label="Aparência" value={form.appearance} onChange={v=>field('appearance',v)} maxLength={4000}/>
      <LargeText label="História e personalidade" value={form.backstory} onChange={v=>field('backstory',v)} rows={4} maxLength={8000}/>
      <LargeText label="Notas gerais" value={form.notes} onChange={v=>field('notes',v)} maxLength={8000}/>
    </section>
    <div className="character-editor-actions"><button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button><button disabled={busy} className="btn btn-primary" type="submit"><Check size={16}/>{busy?'Salvando...':'Salvar ficha'}</button></div>
  </form>
}

export default function CharacterSheet({sheet,bag,canEdit,busy,loading,onSave,onChangeHp,onOpenInventory,onOpenSpellbook,hasSpellbook,itemsCount,coinsGold}){
  const [editing,setEditing]=useState(false)
  if(loading) return <div className="character-empty"><Shield size={35}/><h3>Carregando ficha...</h3></div>
  if(!sheet && !canEdit) return <div className="character-empty"><Shield size={38}/><h3>Ficha ainda não criada</h3><p>O dono da mochila ou o mestre poderá criar esta ficha.</p></div>
  if(!sheet) return <div className="character-empty"><Shield size={43}/><h3>Seu herói merece uma ficha</h3><p>Crie uma ficha vinculada a esta mochila. Seus itens e seu grimório continuarão intactos.</p><button className="btn btn-primary" disabled={busy} onClick={()=>onSave(defaultSheet(bag.id,bag.name.replace(/^Bolsa de\s+/i,'')))}><CirclePlus size={18}/>{busy?'Criando...':'Criar ficha do personagem'}</button></div>
  if(editing) return <Editor key={sheet.bag_id+sheet.updated_at} sheet={sheet} busy={busy} onSave={async s=>{const ok=await onSave(s);if(ok)setEditing(false)}} onCancel={()=>setEditing(false)} />
  const prof=proficiency(sheet)
  const saves=sheet.save_proficiencies||{}
  const attrs=sheet.abilities||{}
  const hpPct=Math.max(0,Math.min(100,Math.round(100*(Number(sheet.hp_current)||0)/Math.max(1,Number(sheet.hp_max)||1))))
  return <div className="character-content">
    <header className="character-head"><div><span className="eyebrow">PERSONAGEM VINCULADO À MOCHILA</span><h3>{sheet.name||bag.name}</h3><p>{[sheet.species,sheet.class_name,sheet.subclass].filter(Boolean).join(' · ')||'Aventureiro'} · Nível {sheet.level}</p></div>{canEdit&&<button className="btn btn-outline" onClick={()=>setEditing(true)}><Pencil size={16}/> Editar ficha</button>}</header>
    <div className="character-meta">{[['Antecedente',sheet.background||'—'],['Tendência',sheet.alignment||'—'],['Experiência',sheet.experience+' XP'],['Proficiência',signed(prof)],['Percepção passiva',passivePerception(sheet)],['Inspiração',sheet.inspiration?'Sim':'Não']].map(([k,v])=><div key={k}><small>{k}</small><strong>{v}</strong></div>)}</div>
    <div className="character-ability-row">{ABILITIES.map(a=><div key={a.key} className="character-ability"><span>{a.short}</span><strong>{signed(mod(attrs[a.key]??10))}</strong><small>{attrs[a.key]??10}</small></div>)}</div>
    <div className="character-combat-grid"><section className="character-card"><h4><Heart size={17}/> Pontos de vida</h4><div className="character-hp"><strong>{sheet.hp_current}</strong><span>/ {sheet.hp_max}</span></div><div className="character-hp-track"><div style={{width:hpPct+'%'}}/></div><p>Temporários: <strong>{sheet.hp_temp}</strong></p>{canEdit&&<div className="character-hp-actions"><button disabled={busy||sheet.hp_current<=0} onClick={()=>onChangeHp(-1)} title="Reduzir 1 PV">−1 PV</button><button disabled={busy||sheet.hp_current>=sheet.hp_max} onClick={()=>onChangeHp(1)} title="Recuperar 1 PV">+1 PV</button></div>}</section>
      <section className="character-card"><h4><Shield size={17}/> Defesa & ação</h4><div className="character-combat-stats"><div><small>CA</small><strong>{sheet.armor_class}</strong></div><div><small>Iniciativa</small><strong>{signed(mod(attrs.dex??10)+Number(sheet.initiative_bonus||0))}</strong></div><div><small>Desloc.</small><strong>{sheet.speed} m</strong></div></div><p>Dados de vida: {sheet.hit_dice||'—'} (gastos: {sheet.hit_dice_spent})</p></section>
      <section className="character-card"><h4><Sparkles size={17}/> Estado</h4><div className="character-death">Salvaguarda contra morte:<br/><span>Sucessos: {'●'.repeat(sheet.death_successes||0)}{'○'.repeat(3-(sheet.death_successes||0))}</span><br/><span>Falhas: {'●'.repeat(sheet.death_failures||0)}{'○'.repeat(3-(sheet.death_failures||0))}</span></div><p>{sheet.conditions||'Nenhuma condição registrada.'}</p></section></div>
    <div className="character-detail-grid"><section className="character-card"><h4>Testes de resistência</h4><div className="character-skill-list">{ABILITIES.map(a=><div key={a.key}><span>{saves[a.key]?'●':'○'} {a.label}</span><strong>{signed(mod(attrs[a.key]??10)+(saves[a.key]?prof:0))}</strong></div>)}</div></section>
      <section className="character-card"><h4>Perícias</h4><div className="character-skill-list">{SKILLS.map(([skill,ability])=><div key={skill}><span>{sheet.skill_proficiencies?.[skill]==='expertise'?'◆':sheet.skill_proficiencies?.[skill]==='proficient'?'●':'○'} {skill}</span><strong>{signed(skillBonus(sheet,skill,ability))}</strong></div>)}</div></section></div>
    <div className="character-lore-grid"><ReadText title="Ataques e dano" value={sheet.attacks}/><ReadText title="Proficiências & idiomas" value={sheet.proficiencies}/><ReadText title="Características & talentos" value={sheet.features}/><ReadText title="Aparência" value={sheet.appearance}/><ReadText title="História" value={sheet.backstory}/><ReadText title="Notas" value={sheet.notes}/></div>
    <div className="character-linked"><h4>Vínculos do personagem</h4><div><button type="button" onClick={onOpenInventory}><Wallet size={17}/> Abrir mochila · {itemsCount} unidades · {coinsGold} PO em moedas</button>{hasSpellbook&&<button type="button" onClick={onOpenSpellbook}><BookMarked size={17}/> Abrir grimório</button>}</div></div>
    <p className="character-disclaimer">Modificadores, proficiência e perícias seguem as fórmulas básicas de D&D 5e; equipamentos, condições e habilidades especiais devem ser ajustados pelo jogador ou mestre.</p>
  </div>
}
