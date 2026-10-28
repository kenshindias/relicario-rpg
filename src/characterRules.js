// D&D 5e: fórmulas base; os dados de classe, equipamento e regras especiais são manuais.
export const ABILITIES = [
  {key:'str',label:'Força',short:'FOR'}, {key:'dex',label:'Destreza',short:'DES'},
  {key:'con',label:'Constituição',short:'CON'}, {key:'int',label:'Inteligência',short:'INT'},
  {key:'wis',label:'Sabedoria',short:'SAB'}, {key:'cha',label:'Carisma',short:'CAR'},
]
export const SKILLS = [
  ['Acrobacia','dex'],['Adestrar Animais','wis'],['Arcanismo','int'],['Atletismo','str'],
  ['Atuação','cha'],['Enganação','cha'],['Furtividade','dex'],['História','int'],
  ['Intimidação','cha'],['Intuição','wis'],['Investigação','int'],['Medicina','wis'],
  ['Natureza','int'],['Percepção','wis'],['Persuasão','cha'],['Prestidigitação','dex'],
  ['Religião','int'],['Sobrevivência','wis'],
]
export const mod = score => Math.floor((Number(score ?? 10) - 10) / 2)
export const signed = n => n >= 0 ? `+${n}` : String(n)
export const proficiency = sheet => sheet.proficiency_override != null && sheet.proficiency_override !== ''
  ? Number(sheet.proficiency_override)
  : 2 + Math.floor((Math.max(1, Number(sheet.level)||1) - 1) / 4)
export const skillBonus = (sheet, key, ability) => {
  const rank = sheet.skill_proficiencies?.[key] || 'none'
  return mod(sheet.abilities?.[ability] ?? 10) + (rank === 'expertise' ? 2 : rank === 'proficient' ? 1 : 0) * proficiency(sheet)
}
export const passivePerception = sheet => 10 + skillBonus(sheet,'Percepção','wis')
export const defaultSheet = (bagId, name) => ({
  bag_id:bagId, name:name||'', class_name:'', subclass:'', species:'', background:'', alignment:'',
  level:1, experience:0, proficiency_override:null, inspiration:false,
  abilities:{str:10,dex:10,con:10,int:10,wis:10,cha:10},
  save_proficiencies:{}, skill_proficiencies:{}, armor_class:10, speed:9, initiative_bonus:0,
  hp_max:10,hp_current:10,hp_temp:0,hit_dice:'1d8',hit_dice_spent:0,
  death_successes:0, death_failures:0, conditions:'',attacks:'',proficiencies:'',
  features:'',appearance:'',backstory:'',notes:'',
})
const INTEGERS = ['level','experience','armor_class','speed','initiative_bonus','hp_max','hp_current','hp_temp','hit_dice_spent','death_successes','death_failures']
export function sheetPayload(sheet) {
  const s={...sheet,abilities:{...sheet.abilities},save_proficiencies:{...sheet.save_proficiencies},skill_proficiencies:{...sheet.skill_proficiencies}}
  delete s.updated_at
  for(const k of INTEGERS) s[k]=Number(s[k])
  s.proficiency_override = s.proficiency_override === '' || s.proficiency_override === null || s.proficiency_override === undefined ? null : Number(s.proficiency_override)
  for (const a of ABILITIES) s.abilities[a.key]=Number(s.abilities[a.key] ?? 10)
  if (INTEGERS.some(k=>!Number.isSafeInteger(s[k]))) throw new Error('Os valores numéricos precisam ser inteiros.')
  if(ABILITIES.some(a=>!Number.isInteger(s.abilities[a.key]) || s.abilities[a.key]<1 || s.abilities[a.key]>30)) throw new Error('Os atributos devem ficar entre 1 e 30.')
  if(s.hp_current>s.hp_max) throw new Error('PV atuais não podem exceder PV máximos; use PV temporários se necessário.')
  return s
}
