import { createClient } from '@supabase/supabase-js'
import { sheetPayload } from '../characterRules.js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const isDemo = !URL || !KEY || URL.includes('SEU-PROJETO') || KEY.includes('COLE_AQUI')
export const supabase = isDemo ? null : createClient(URL, KEY, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
})
export const demoUser = { id: 'demo-aventureiro', email: 'aventureiro@relicario.demo' }

const STORE = 'relicario_demo_v1'
const uid = () => (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
const when = () => new Date().toISOString()

function demoInitial() {
  const mesa = 'mesa-demo'
  const group = 'bolsa-grupo'
  const hero = 'bolsa-heroi'
  return {
    mesas: [{ id: mesa, name: 'Crônicas de Eldoria', system: 'D&D 5ª edição', owner_id: demoUser.id, invite_code: 'DEMO12345678', created_at: when() }],
    bags: [
      { id: group, mesa_id: mesa, name: 'Baú do grupo', kind: 'grupo', owner_id: null, created_at: when() },
      { id: hero, mesa_id: mesa, name: 'Bolsa de Kael', kind: 'personagem', owner_id: demoUser.id, created_at: when() },
    ],
    items: [
      { id: 'i1', bag_id: group, name: 'Rubi de Sangue', category: 'Tesouros', quantity: 2, value_po: 250, notes: 'Encontrado na cripta do rei.', created_at: when() },
      { id: 'i2', bag_id: group, name: 'Poção de Cura', category: 'Consumíveis', quantity: 4, value_po: 50, notes: 'Cura 2d4 + 2 pontos de vida.', created_at: when() },
      { id: 'i3', bag_id: group, name: 'Mapa da Costa Esquecida', category: 'Equipamentos', quantity: 1, value_po: 15, notes: 'Marca uma torre ao norte.', created_at: when() },
      { id: 'i4', bag_id: hero, name: 'Espada Longa +1', category: 'Armas', quantity: 1, value_po: 500, notes: 'Uma lâmina de aço rúnico.', created_at: when() },
    ],
    coins: { [group]: { bag_id: group, pc: 35, pp: 12, pe: 0, po: 324, pl: 3 }, [hero]: { bag_id: hero, pc: 10, pp: 3, pe: 0, po: 83, pl: 0 } },
    moves: [{ id: 'm1', bag_id: group, coin: 'po', delta: 100, note: 'Recompensa da missão', created_at: when() }],
  }
}

function getDemo() {
  try {
    const saved = localStorage.getItem(STORE)
    if (saved) return JSON.parse(saved)
  } catch { /* storage bloqueado */ }
  const seed = demoInitial()
  saveDemo(seed)
  return seed
}
function saveDemo(data) { localStorage.setItem(STORE, JSON.stringify(data)) }
function mutate(fn) { const db = getDemo(); const result = fn(db); saveDemo(db); return Promise.resolve(result) }
function sortByName(rows) { return rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) }
function unwrap({ data, error }) { if (error) throw error; return data }

export const api = {
  async getMesas() {
    if (isDemo) return [...getDemo().mesas].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return unwrap(await supabase.from('mesas').select('*').order('created_at', { ascending: false }))
  },
  async createMesa(name, system) {
    if (isDemo) return mutate(db => {
      const id = uid(), bag = uid()
      db.mesas.push({ id, name, system, owner_id: demoUser.id, invite_code: uid().replace(/-/g, '').slice(0, 12).toUpperCase(), created_at: when() })
      db.bags.push({ id: bag, mesa_id: id, name: 'Baú do grupo', kind: 'grupo', owner_id: null, created_at: when() })
      db.coins[bag] = { bag_id: bag, pc: 0, pp: 0, pe: 0, po: 0, pl: 0 }
      return id
    })
    return unwrap(await supabase.rpc('create_mesa', { p_name: name, p_system: system }))
  },
  async joinMesa(code) {
    if (isDemo) return mutate(db => {
      const match = db.mesas.find(m => m.invite_code === code.trim().toUpperCase())
      if (!match) throw new Error('Código de convite inválido')
      return match.id
    })
    return unwrap(await supabase.rpc('join_mesa', { p_code: code }))
  },
  async deleteMesa(id) {
    if (isDemo) return mutate(db => {
      const ids = db.bags.filter(b => b.mesa_id === id).map(b => b.id)
      db.mesas = db.mesas.filter(m => m.id !== id)
      db.bags = db.bags.filter(b => b.mesa_id !== id)
      db.items = db.items.filter(i => !ids.includes(i.bag_id))
      db.moves = db.moves.filter(i => !ids.includes(i.bag_id))
      ids.forEach(x => { delete db.coins[x]; if (db.characterSheets) delete db.characterSheets[x] })
    })
    return unwrap(await supabase.from('mesas').delete().eq('id', id))
  },
  async getBags(mesaId) {
    if (isDemo) return sortByName(getDemo().bags.filter(b => b.mesa_id === mesaId))
    return unwrap(await supabase.from('bags').select('*').eq('mesa_id', mesaId).order('created_at'))
  },
  async createBag(mesaId, name, kind, userId) {
    const payload = { mesa_id: mesaId, name, kind, owner_id: kind === 'grupo' ? null : userId }
    if (isDemo) return mutate(db => {
      const bag = { ...payload, id: uid(), created_at: when() }
      db.bags.push(bag)
      db.coins[bag.id] = { bag_id: bag.id, pc: 0, pp: 0, pe: 0, po: 0, pl: 0 }
      return bag
    })
    return unwrap(await supabase.from('bags').insert(payload).select().single())
  },
  async deleteBag(id) {
    if (isDemo) return mutate(db => {
      db.bags = db.bags.filter(b => b.id !== id)
      db.items = db.items.filter(i => i.bag_id !== id)
      db.moves = db.moves.filter(i => i.bag_id !== id)
      delete db.coins[id]
      if (db.characterSheets) delete db.characterSheets[id]
    })
    return unwrap(await supabase.from('bags').delete().eq('id', id))
  },
  async getItems(bagId) {
    if (isDemo) return sortByName(getDemo().items.filter(i => i.bag_id === bagId))
    return unwrap(await supabase.from('items').select('*').eq('bag_id', bagId).order('name'))
  },
  async saveItem(item) {
    const payload = { bag_id: item.bag_id, name: item.name, category: item.category, quantity: Number(item.quantity), value_po: Number(item.value_po || 0), notes: item.notes || '' }
    if (isDemo) return mutate(db => {
      const updated = { ...payload, id: item.id || uid(), created_at: when(), updated_at: when() }
      const index = db.items.findIndex(i => i.id === item.id)
      if (index === -1) db.items.push(updated)
      else db.items[index] = { ...db.items[index], ...updated }
      return updated
    })
    if (item.id) return unwrap(await supabase.from('items').update(payload).eq('id', item.id).select().single())
    return unwrap(await supabase.from('items').insert(payload).select().single())
  },
  async deleteItem(id) {
    if (isDemo) return mutate(db => { db.items = db.items.filter(i => i.id !== id) })
    return unwrap(await supabase.from('items').delete().eq('id', id))
  },
  async transferItem(itemId, targetBagId, quantity) {
    if (isDemo) return mutate(db => {
      const source = db.items.find(i => i.id === itemId)
      if (!source) throw new Error('Item não encontrado. Atualize o inventário.')
      const origin = db.bags.find(b => b.id === source.bag_id)
      const target = db.bags.find(b => b.id === targetBagId)
      if (!origin || !target || origin.mesa_id !== target.mesa_id || origin.id === target.id || origin.kind === target.kind) throw new Error('Só é possível transferir entre baú do grupo e bolsa de personagem da mesma mesa.')
      const amount = Number(quantity)
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > source.quantity) throw new Error('Quantidade indisponível nesta bolsa.')
      const other = db.items.find(i => i.bag_id === targetBagId && i.name === source.name && i.category === source.category && Number(i.value_po) === Number(source.value_po) && i.notes === source.notes && i.quantity + amount <= 1000000)
      if (other) { other.quantity += amount; other.updated_at = when() }
      else if (amount === source.quantity) { source.bag_id = targetBagId; source.updated_at = when() }
      else db.items.push({ ...source, id: uid(), bag_id: targetBagId, quantity: amount, created_at: when(), updated_at: when() })
      if (other || amount < source.quantity) {
        if (amount === source.quantity) db.items = db.items.filter(i => i.id !== itemId)
        else { source.quantity -= amount; source.updated_at = when() }
      }
      return true
    })
    return unwrap(await supabase.rpc('transfer_item', { p_item_id: itemId, p_target_bag_id: targetBagId, p_quantity: Number(quantity) }))
  },
  async getCharacterSheet(bagId) {
    if (isDemo) return (getDemo().characterSheets || {})[bagId] || null
    return unwrap(await supabase.from('character_sheets').select('*').eq('bag_id', bagId).maybeSingle())
  },
  async saveCharacterSheet(sheet) {
    const payload=sheetPayload(sheet)
    if (isDemo) return mutate(db => {
      const bag=db.bags.find(b=>b.id===payload.bag_id)
      if (!bag || bag.kind !== 'personagem') throw new Error('A ficha só pode pertencer a uma mochila de personagem.')
      db.characterSheets ||= {}
      db.characterSheets[payload.bag_id]={...payload,updated_at:when()}
      return db.characterSheets[payload.bag_id]
    })
    return unwrap(await supabase.from('character_sheets').upsert(payload,{onConflict:'bag_id'}).select().single())
  },
  async adjustCharacterHp(bagId,delta) {
    if (isDemo) return mutate(db=>{
      const sheet=db.characterSheets?.[bagId]
      if(!sheet) throw new Error('Crie a ficha primeiro.')
      sheet.hp_current=Math.min(sheet.hp_max,Math.max(0,sheet.hp_current+delta))
      sheet.updated_at=when()
      return sheet.hp_current
    })
    return unwrap(await supabase.rpc('adjust_character_hp',{p_bag_id:bagId,p_delta:delta}))
  },
  async getCoins(bagId) {
    if (isDemo) return getDemo().coins[bagId] || { bag_id: bagId, pc: 0, pp: 0, pe: 0, po: 0, pl: 0 }
    return unwrap(await supabase.from('bag_coins').select('*').eq('bag_id', bagId).single())
  },
  async adjustCoins(bagId, coin, delta, note) {
    if (isDemo) return mutate(db => {
      const wallet = db.coins[bagId]
      if (!wallet || wallet[coin] + delta < 0) throw new Error('Saldo insuficiente')
      wallet[coin] += delta
      db.moves.unshift({ id: uid(), bag_id: bagId, coin, delta, note, created_at: when() })
      return { ...wallet }
    })
    return unwrap(await supabase.rpc('adjust_coins', { p_bag_id: bagId, p_coin: coin, p_delta: delta, p_note: note }))
  },
  async getSpellbook(bagId) {
    if (isDemo) {
      const db = getDemo()
      return { book: (db.spellbooks || {})[bagId] || null, spells: (db.spells || []).filter(s=>s.bag_id===bagId).sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name)), usage: (db.spellUsage||[]).filter(u=>u.bag_id===bagId).slice(0,15) }
    }
    const [book, spells, usage] = await Promise.all([
      supabase.from('spellbooks').select('*').eq('bag_id',bagId).maybeSingle(),
      supabase.from('spells').select('*').eq('bag_id',bagId).order('level').order('name'),
      supabase.from('spell_material_usage').select('*').eq('bag_id',bagId).order('created_at',{ascending:false}).limit(15),
    ])
    return {book:unwrap(book),spells:unwrap(spells),usage:unwrap(usage)}
  },
  async toggleSpellbook(bagId,enabled) {
    if (isDemo) return mutate(db=>{
      db.spellbooks ||= {}; db.spellbooks[bagId]={bag_id:bagId,enabled,slots:db.spellbooks[bagId]?.slots||{}}; return enabled
    })
    return unwrap(await supabase.rpc('toggle_spellbook',{p_bag_id:bagId,p_enabled:enabled}))
  },
  async saveSpell(bagId,payload,id) {
    if (isDemo) return mutate(db=>{
      db.spells ||= []
      const next={...payload,id:id||uid(),bag_id:bagId,created_at:when(),updated_at:when()}
      const i=db.spells.findIndex(s=>s.id===id)
      if(i<0) db.spells.push(next); else db.spells[i]={...db.spells[i],...next}
      return next.id
    })
    return unwrap(await supabase.rpc('save_spell',{p_bag_id:bagId,p_payload:payload,p_spell_id:id||null}))
  },
  async deleteSpell(id) {
    if (isDemo) return mutate(db=>{db.spells=(db.spells||[]).filter(s=>s.id!==id);return true})
    return unwrap(await supabase.rpc('delete_spell',{p_spell_id:id}))
  },
  async prepareSpell(id,prepared) {
    if (isDemo) return mutate(db=>{const s=(db.spells||[]).find(x=>x.id===id);if(s)s.prepared=prepared;return prepared})
    return unwrap(await supabase.rpc('set_spell_prepared',{p_spell_id:id,p_prepared:prepared}))
  },
  async setSpellSlots(bagId,level,total,used) {
    if (isDemo) return mutate(db=>{
      db.spellbooks ||= {}; db.spellbooks[bagId] ||= {bag_id:bagId,enabled:true,slots:{}}
      db.spellbooks[bagId].slots[level]={total,used};return db.spellbooks[bagId].slots
    })
    return unwrap(await supabase.rpc('set_spell_slots',{p_bag_id:bagId,p_level:level,p_total:total,p_used:used}))
  },
  async consumeSpellMaterials(spellId) {
    if (isDemo) return mutate(db=>{
      const spell=(db.spells||[]).find(s=>s.id===spellId)
      if(!spell)throw Error('Magia não encontrada')
      const consumed=(spell.materials||[]).filter(x=>x.consumed)
      if(!consumed.length)throw Error('A magia não possui materiais consumíveis')
      const totals={}
      for(const mat of consumed){
        if(!mat.item_id)throw Error(`Vincule o componente ${mat.name} antes de consumir`)
        totals[mat.item_id]=(totals[mat.item_id]||0)+Number(mat.quantity)
      }
      for(const [id,count] of Object.entries(totals)){
        const item=db.items.find(i=>i.id===id&&i.bag_id===spell.bag_id)
        if(!item||item.quantity<count)throw Error('Materiais insuficientes na mochila')
      }
      db.spellUsage ||= []
      for(const [id,count] of Object.entries(totals)){
        const item=db.items.find(i=>i.id===id)
        db.spellUsage.unshift({id:uid(),bag_id:spell.bag_id,spell_name:spell.name,item_name:item.name,quantity:count,created_at:when()})
        item.quantity-=count
      }
      db.items=db.items.filter(i=>i.quantity>0)
      return Object.values(totals).reduce((a,b)=>a+b,0)
    })
    return unwrap(await supabase.rpc('consume_spell_materials',{p_spell_id:spellId}))
  },
  async getMoves(bagId) {
    if (isDemo) return getDemo().moves.filter(m => m.bag_id === bagId).slice(0, 12)
    return unwrap(await supabase.from('coin_moves').select('*').eq('bag_id', bagId).order('created_at', { ascending: false }).limit(12))
  },
}
