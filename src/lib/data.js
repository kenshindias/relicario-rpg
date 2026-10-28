import { createClient } from '@supabase/supabase-js'

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
      ids.forEach(x => delete db.coins[x])
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
  async getMoves(bagId) {
    if (isDemo) return getDemo().moves.filter(m => m.bag_id === bagId).slice(0, 12)
    return unwrap(await supabase.from('coin_moves').select('*').eq('bag_id', bagId).order('created_at', { ascending: false }).limit(12))
  },
}
