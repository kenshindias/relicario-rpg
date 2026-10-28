import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive, ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, BookOpen, Check,
  ChevronDown, Coins, Copy, Crown, Gem, Hammer, KeyRound, LogOut, Menu,
  Package, Pencil, Plus, RefreshCw, ScrollText, Search, Shield, ShieldCheck,
  Sparkles, Sword, Trash2, Users, Wallet, X, WandSparkles, BookMarked, FlaskConical, CircleAlert, CheckCircle2, Minus, Eye, EyeOff,
} from 'lucide-react'
import { api, demoUser, isDemo, supabase } from './lib/data'

const SCHOOLS = ['Abjuração','Adivinhação','Conjuração','Encantamento','Evocação','Ilusão','Necromancia','Transmutação']
const SPELL_LEVEL = n => n === 0 ? 'Truque' : `${n}º círculo`
const cleanName = s => (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim()
const CATEGORIES = ['Armas', 'Armaduras', 'Equipamentos', 'Consumíveis', 'Magia', 'Componentes', 'Tesouros', 'Outros']
const COINS = [
  { key: 'pc', label: 'Cobre', abbr: 'PC', className: 'copper' },
  { key: 'pp', label: 'Prata', abbr: 'PP', className: 'silver' },
  { key: 'pe', label: 'Electro', abbr: 'PE', className: 'electrum' },
  { key: 'po', label: 'Ouro', abbr: 'PO', className: 'gold' },
  { key: 'pl', label: 'Platina', abbr: 'PL', className: 'platinum' },
]
const EMPTY_WALLET = { pc: 0, pp: 0, pe: 0, po: 0, pl: 0 }
const CAT_ICONS = { Armas: Sword, Armaduras: Shield, Equipamentos: Package, Consumíveis: Sparkles, Magia: BookOpen, Componentes: Hammer, Tesouros: Gem, Outros: Archive }
const formatNum = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(n) || 0)
const formatMoney = n => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0)
const moneyValue = w => (Number(w.pc || 0) + 10 * Number(w.pp || 0) + 50 * Number(w.pe || 0) + 100 * Number(w.po || 0) + 1000 * Number(w.pl || 0)) / 100
const humanError = e => {
  const message = e?.message || String(e)
  if (message.includes('Could not find the function public.transfer_item') || message.includes('function public.transfer_item') || message.includes('PGRST202')) return 'Falta aplicar a atualização de transferências no SQL Editor do Supabase.'
  if (message.includes('Could not find the function public.save_spell') || message.includes('relation \"public.spellbooks\" does not exist') || message.includes('spellbooks')) return 'Execute ATUALIZACAO_GRIMORIO_v1.2.sql no Supabase antes de usar o grimório.'
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (message.includes('Email not confirmed')) return 'Confirme seu e-mail para entrar.'
  if (message.includes('User already registered')) return 'Este e-mail já está cadastrado.'
  if (message.includes('rate limit')) return 'Muitas tentativas. Aguarde alguns minutos.'
  if (message.includes('row-level security') || message.includes('permission denied')) return 'Você não tem permissão para realizar esta ação.'
  return message
}

function Modal({ title, subtitle, children, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-top"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={19}/></button></div>
      {children}
    </div>
  </div>
}

function Auth({ onNotify }) {
  const [signup, setSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('')
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
        })
        if (error) throw error
        if (!data.session) setMessage('Cadastro enviado! Verifique seu e-mail e confirme a conta antes de entrar.')
        else onNotify('Conta criada! Bem-vindo ao Relicário.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) { setMessage(humanError(err)) }
    finally { setBusy(false) }
  }
  return <div className="auth-screen">
    <div className="auth-glow"/>
    <div className="auth-card">
      <div className="auth-symbol"><Gem size={35}/></div>
      <span className="eyebrow">SEU INVENTÁRIO, SUA AVENTURA</span>
      <h1>O tesouro da sua mesa, <em>em um só lugar.</em></h1>
      <p className="auth-lede">Equipamentos, moedas e relíquias organizados entre todos os aventureiros.</p>
      <form onSubmit={submit} className="stack-form">
        <label>E-mail<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" required /></label>
        <label>Senha<input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete={signup ? 'new-password' : 'current-password'} required /></label>
        {message && <div className="inline-message">{message}</div>}
        <button className="btn btn-primary full" disabled={busy} type="submit">{busy ? 'Aguarde...' : signup ? 'Criar minha conta' : 'Entrar no Relicário'} <ArrowRight size={17}/></button>
      </form>
      <p className="auth-switch">{signup ? 'Já é aventureiro?' : 'Sua primeira jornada?'} <button type="button" onClick={()=>{setSignup(!signup);setMessage('')}}>{signup ? 'Entrar' : 'Criar uma conta'}</button></p>
    </div>
    <div className="auth-bottom">RELICÁRIO · FEITO PARA MESAS DE RPG</div>
  </div>
}

function App() {
  const [session, setSession] = useState(isDemo ? { user: demoUser } : null)
  const [authReady, setAuthReady] = useState(isDemo)
  const [mesas, setMesas] = useState([])
  const [mesaId, setMesaId] = useState(null)
  const [bags, setBags] = useState([])
  const [bagId, setBagId] = useState(null)
  const [items, setItems] = useState([])
  const [wallet, setWallet] = useState(EMPTY_WALLET)
  const [moves, setMoves] = useState([])
  const [spellbookData, setSpellbookData] = useState({book:null,spells:[],usage:[]})
  const [tab, setTab] = useState('inventory')
  const [category, setCategory] = useState('Todas')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [showMobileNav, setShowMobileNav] = useState(false)
  const user = session?.user
  const selectedMesa = mesas.find(x => x.id === mesaId)
  const selectedBag = bags.find(x => x.id === bagId)
  const master = selectedMesa?.owner_id === user?.id
  const canEdit = !!selectedBag && (master || selectedBag.kind === 'grupo' || selectedBag.owner_id === user?.id)
  // Somente transfers entre baú coletivo e bolsa de personagem editável.
  const transferTargets = bags.filter(b => b.id !== bagId && b.kind !== selectedBag?.kind &&
    (master || b.kind === 'grupo' || b.owner_id === user?.id))

  const notify = useCallback(message => setToast(message), [])
  useEffect(() => { if (!toast) return; const id = setTimeout(()=>setToast(''), 3500); return ()=>clearTimeout(id) }, [toast])
  useEffect(() => {
    if (isDemo) return
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) { setSession(data.session); setAuthReady(true) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, current) => { if (mounted) { setSession(current); setAuthReady(true) } })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const reloadMesas = useCallback(async preferred => {
    const data = await api.getMesas()
    setMesas(data)
    setMesaId(old => {
      if (preferred && data.some(m => m.id === preferred)) return preferred
      if (old && data.some(m => m.id === old)) return old
      return data[0]?.id || null
    })
  }, [])

  const reloadBags = useCallback(async (currentMesa, preferred) => {
    if (!currentMesa) { setBags([]); setBagId(null); return }
    const data = await api.getBags(currentMesa)
    setBags(data)
    setBagId(old => {
      if (preferred && data.some(b => b.id === preferred)) return preferred
      if (old && data.some(b => b.id === old)) return old
      return data.find(b => b.kind === 'grupo')?.id || data[0]?.id || null
    })
  }, [])

  const reloadBagData = useCallback(async currentBag => {
    if (!currentBag) { setItems([]); setWallet(EMPTY_WALLET); setMoves([]); return }
    const [newItems, newCoins, newMoves] = await Promise.all([
      api.getItems(currentBag), api.getCoins(currentBag), api.getMoves(currentBag),
    ])
    setItems(newItems); setWallet(newCoins || EMPTY_WALLET); setMoves(newMoves)
  }, [])

  const reloadGrimorio = useCallback(async currentBag => {
    if(!currentBag) { setSpellbookData({book:null,spells:[],usage:[]});return }
    setSpellbookData(await api.getSpellbook(currentBag))
  }, [])
  useEffect(() => {
    reloadGrimorio(bagId).catch(e=>notify(humanError(e)))
  }, [bagId,reloadGrimorio,notify])

  useEffect(() => {
    if(!bagId) return
    const id=setInterval(()=>reloadGrimorio(bagId).catch(()=>{}),15000)
    return ()=>clearInterval(id)
  },[bagId,reloadGrimorio])

  useEffect(() => {
    if (!user) { setMesas([]);setMesaId(null);return }
    reloadMesas().catch(e=>notify(humanError(e)))
  }, [user?.id, reloadMesas, notify])
  useEffect(() => {
    setTab('inventory'); setCategory('Todas'); setSearch('')
    reloadBags(mesaId).catch(e=>notify(humanError(e)))
  }, [mesaId, reloadBags, notify])
  useEffect(() => {
    setLoading(true)
    reloadBagData(bagId).catch(e=>notify(humanError(e))).finally(()=>setLoading(false))
    if (!bagId) return
    const id = setInterval(() => {
      reloadBagData(bagId).catch(()=>{})
    }, 15000)
    return () => clearInterval(id)
  }, [bagId, reloadBagData, notify])
  useEffect(() => {
    if (!mesaId) return
    const id = setInterval(()=>reloadBags(mesaId).catch(()=>{}), 30000)
    return () => clearInterval(id)
  }, [mesaId, reloadBags])

  const filteredItems = useMemo(()=>items.filter(item =>
    (category === 'Todas' || item.category === category) &&
    `${item.name} ${item.notes}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR').trim())
  ), [items, category, search])
  const itemCount = items.reduce((total, item) => total + Number(item.quantity), 0)
  const treasureValue = items.reduce((total, item) => total + Number(item.quantity) * Number(item.value_po), 0)

  async function perform(fn, success, close = true) {
    setBusy(true)
    try { await fn(); if (close) setModal(null); if (success) notify(success) }
    catch (e) { notify(humanError(e)) }
    finally { setBusy(false) }
  }
  async function copyInvite() {
    try { await navigator.clipboard.writeText(selectedMesa.invite_code); notify('Código copiado! Envie aos aventureiros.') }
    catch { notify(`Código: ${selectedMesa.invite_code}`) }
  }
  function removeBag() {
    if (!selectedBag || !canEdit) return
    if (!window.confirm(`Excluir "${selectedBag.name}"? Todos os itens, moedas e histórico desta bolsa serão perdidos.`)) return
    perform(async()=>{ await api.deleteBag(bagId); await reloadBags(mesaId) }, 'Bolsa excluída.')
  }
  function removeMesa() {
    if (!master || !selectedMesa) return
    if (!window.confirm(`Excluir a mesa "${selectedMesa.name}" DEFINITIVAMENTE? Isso apagará todos os inventários e moedas dela para todos os participantes.`)) return
    perform(async()=>{ await api.deleteMesa(mesaId); await reloadMesas() }, 'Mesa excluída.')
  }
  function deleteItem(item) {
    if (!window.confirm(`Remover "${item.name}" do inventário?`)) return
    perform(async()=>{await api.deleteItem(item.id);await reloadBagData(bagId)}, 'Item removido.')
  }

  if (!authReady) return <div className="loading-screen"><Gem size={35}/> Abrindo seu relicário...</div>
  if (!user) return <Auth onNotify={notify}/>
  const username = user.email?.split('@')[0] || 'Aventureiro'

  return <div className="app-shell">
    <aside className={`sidebar ${showMobileNav ? 'mobile-open' : ''}`}>
      <div className="brand"><div className="brand-symbol"><Gem size={23}/></div><div><div className="brand-name">RELICÁRIO</div><div className="brand-sub">INVENTÁRIO DE AVENTURAS</div></div></div>
      <div className="side-section-title">SUAS MESAS <span>{mesas.length.toString().padStart(2,'0')}</span></div>
      <div className="mesa-list">
        {mesas.map(m=><button key={m.id} className={`mesa-button ${mesaId === m.id ? 'active' : ''}`} onClick={()=>{setMesaId(m.id);setShowMobileNav(false)}}>
          <span className="mesa-emblem"><BookOpen size={17}/></span><span className="mesa-name-wrap"><strong>{m.name}</strong><small>{m.system}</small></span>{mesaId === m.id && <span className="mesa-active-dot"/>}
        </button>)}
        {!mesas.length && <p className="sidebar-muted">A aventura começa com uma mesa.</p>}
      </div>
      <div className="sidebar-add"><button className="side-add-button" onClick={()=>{setModal({type:'createMesa'});setShowMobileNav(false)}}><Plus size={17}/> Nova mesa</button><button className="side-add-button side-add-quiet" onClick={()=>{setModal({type:'joinMesa'});setShowMobileNav(false)}}><KeyRound size={17}/> Entrar com código</button></div>
      <div className="sidebar-bottom">
        {isDemo && <div className="demo-badge"><Sparkles size={15}/> MODO DEMONSTRAÇÃO <span>Os dados ficam neste navegador.</span></div>}
        <div className="account"><div className="avatar">{username.slice(0,1).toUpperCase()}</div><div className="account-text"><strong>{username}</strong><span>{isDemo ? 'Explorando o app' : 'Aventureiro conectado'}</span></div>{!isDemo && <button className="icon-button" title="Sair da conta" onClick={()=>supabase.auth.signOut()}><LogOut size={17}/></button>}</div>
      </div>
    </aside>
    {showMobileNav && <div className="nav-overlay" onClick={()=>setShowMobileNav(false)}/>}
    <div className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={()=>setShowMobileNav(true)} aria-label="Abrir mesas"><Menu size={21}/></button><div className="breadcrumb">SEU ESPAÇO <span>/</span> {selectedMesa?.name || 'INÍCIO'}</div><div className="topbar-right"><span className="top-status"><span/> {isDemo ? 'DEMONSTRAÇÃO' : 'SINCRONIZADO'}</span><div className="top-avatar">{username.slice(0,1).toUpperCase()}</div></div></header>
      <main className="main-content">
        {!selectedMesa ? <div className="empty-home"><div className="empty-home-art"><Gem size={63}/></div><span className="eyebrow">A PRIMEIRA PÁGINA DA SUA HISTÓRIA</span><h1>Todo grande tesouro<br/><em>começa com uma aventura.</em></h1><p>Crie uma mesa para organizar moedas, itens e tesouros, ou entre na mesa de um amigo usando um código.</p><div className="empty-home-actions"><button className="btn btn-primary" onClick={()=>setModal({type:'createMesa'})}><Plus size={18}/> Criar mesa</button><button className="btn btn-outline" onClick={()=>setModal({type:'joinMesa'})}><KeyRound size={18}/> Tenho um convite</button></div></div> : <>
          <div className="page-heading"><div className="page-heading-copy"><div className="eyebrow"><span className="tiny-diamond">◆</span> SUA CAMPANHA · {selectedMesa.system.toUpperCase()}</div><h1>{selectedMesa.name}</h1><p>Seus tesouros, itens e moedas. Todos em seu devido lugar.</p></div><div className="heading-actions"><button className="btn btn-outline invite-button" title="Copiar código de convite" onClick={copyInvite}><Users size={17}/> <span>Código: <strong>{selectedMesa.invite_code}</strong></span><Copy size={15}/></button>{master && <button className="icon-button danger-muted" title="Excluir mesa" aria-label="Excluir mesa" onClick={removeMesa}><Trash2 size={18}/></button>}</div></div>
          <div className="stats-grid"><div className="stat-card"><div className="stat-icon icon-gold"><Archive size={21}/></div><div><span>ITENS NESTA BOLSA</span><strong>{formatNum(itemCount)}</strong><small>Contando quantidades</small></div></div><div className="stat-card"><div className="stat-icon icon-purple"><Coins size={22}/></div><div><span>FORTUNA EM MOEDAS</span><strong>{formatMoney(moneyValue(wallet))} <small>PO</small></strong><small>Equivalente em peças de ouro</small></div></div><div className="stat-card"><div className="stat-icon icon-blue"><Gem size={21}/></div><div><span>VALOR DOS ITENS</span><strong>{formatMoney(treasureValue)} <small>PO</small></strong><small>Valor estimado do inventário</small></div></div></div>
          <div className="section-heading"><div><span className="eyebrow">ORGANIZAÇÃO</span><h2>Bolsas & inventários</h2></div><button className="btn btn-outline" onClick={()=>setModal({type:'createBag'})}><Plus size={17}/> Nova bolsa</button></div>
          <div className="bag-strip">{bags.map(b=><button key={b.id} className={`bag-pill ${bagId === b.id ? 'selected' : ''}`} onClick={()=>{setBagId(b.id);setTab('inventory');setCategory('Todas');setSearch('');setSpellbookData({book:null,spells:[],usage:[]})}}>{b.kind === 'grupo' ? <Users size={17}/> : <Package size={17}/>}<span>{b.name}</span>{b.kind === 'grupo' && <small>GRUPO</small>}</button>)}{!bags.length && <div className="no-bag">Nenhuma bolsa por enquanto.</div>}</div>
          {selectedBag ? <div className="inventory-panel">
            <div className="panel-head"><div><div className="panel-kicker">{selectedBag.kind === 'grupo' ? 'COMPARTILHADO COM A MESA' : 'BOLSA DE PERSONAGEM'} <span className="dot-separator">·</span> {canEdit ? 'VOCÊ PODE EDITAR' : 'SOMENTE LEITURA'}</div><div className="panel-title-row"><h2>{selectedBag.name}</h2>{canEdit && <button className="icon-button danger-muted" title="Excluir bolsa" onClick={removeBag}><Trash2 size={16}/></button>}</div></div><div className="panel-control-row">{selectedBag.kind === 'personagem' && canEdit && <button className="btn btn-outline spellbook-enable" disabled={busy} onClick={()=>perform(async()=>{await api.toggleSpellbook(bagId,!spellbookData.book?.enabled);await reloadGrimorio(bagId);setTab(spellbookData.book?.enabled?'inventory':'grimorio')},spellbookData.book?.enabled?'Grimório ocultado; magias preservadas.':'Grimório ativado!',false)}>{spellbookData.book?.enabled?<EyeOff size={15}/>:<BookMarked size={15}/>} {spellbookData.book?.enabled?'Ocultar grimório':'Ativar grimório'}</button>}<button className="icon-button" title="Atualizar dados" onClick={()=>perform(async()=>{await reloadBagData(bagId);await reloadGrimorio(bagId)}, 'Atualizado.', false)}><RefreshCw size={19}/></button></div></div>
            <div className="tabs"><button onClick={()=>setTab('inventory')} className={tab==='inventory'?'active':''}><Package size={18}/> Inventário <span>{items.length}</span></button><button onClick={()=>setTab('coins')} className={tab==='coins'?'active':''}><Wallet size={18}/> Moedas & histórico</button>{selectedBag.kind==='personagem' && spellbookData.book?.enabled && <button onClick={()=>setTab('grimorio')} className={tab==='grimorio'?'active':''}><BookMarked size={18}/> Grimório <span>{spellbookData.spells.length}</span></button>}</div>
            {tab === 'inventory' ? <div className="inventory-content">
              <div className="inventory-tools"><div className="search-wrap"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar item ou descrição..." aria-label="Buscar itens" /></div>{canEdit && <button className="btn btn-primary" onClick={()=>setModal({type:'item',item:null})}><Plus size={18}/> Adicionar item</button>}</div>
              <div className="category-pills">{['Todas', ...CATEGORIES].map(c=><button key={c} className={category===c?'on':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>
              {loading ? <div className="content-empty">Carregando os tesouros...</div> : filteredItems.length ? <div className="item-grid">{filteredItems.map(item=>{
                const Icon = CAT_ICONS[item.category] || Package
                return <div key={item.id} className="item-card"><div className="item-top"><div className={`item-glyph glyph-${item.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}`}><Icon size={24}/></div><span className="qty-chip">×{formatNum(item.quantity)}</span></div><span className="item-category">{item.category}</span><h3>{item.name}</h3><p>{item.notes || 'Sem observações adicionadas.'}</p><div className="item-footer"><span className="item-value"><Coins size={15}/> {formatMoney(item.value_po)} PO <small>/ un.</small></span>{canEdit && <div className="item-actions">{transferTargets.length > 0 && <button className="transfer-button" title={`Transferir ${item.name} para outra bolsa`} aria-label={`Transferir ${item.name}`} onClick={()=>setModal({type:'transfer',item,sourceBag:selectedBag,targets:transferTargets})}><ArrowLeftRight size={15}/> Transferir</button>}<button className="icon-button" title="Editar" aria-label={`Editar ${item.name}`} onClick={()=>setModal({type:'item',item})}><Pencil size={16}/></button><button className="icon-button danger-muted" title="Excluir" aria-label={`Excluir ${item.name}`} onClick={()=>deleteItem(item)}><Trash2 size={16}/></button></div>}</div></div>
              })}</div> : <div className="content-empty"><Package size={32}/><h3>Nenhum item encontrado</h3><p>{items.length ? 'Experimente outra busca ou categoria.' : 'Sua jornada está pronta para receber o primeiro tesouro.'}</p>{canEdit && !items.length && <button className="btn btn-outline" onClick={()=>setModal({type:'item',item:null})}><Plus size={16}/> Adicionar primeiro item</button>}</div>}
            </div> : tab === 'coins' ? <div className="coin-content"><div className="wallet-head"><div><div className="eyebrow">CARTEIRA DA BOLSA</div><h3>Suas moedas</h3><p>Cada valor é registrado separadamente.</p></div><div className="wallet-total"><span>SALDO EQUIVALENTE</span><strong>{formatMoney(moneyValue(wallet))} <small>PO</small></strong></div></div><div className="coin-grid">{COINS.map(c=><div key={c.key} className={`coin-card ${c.className}`}><div className="coin-circle"><Coins size={25}/></div><span className="coin-label">{c.label} <small>{c.abbr}</small></span><strong>{formatNum(wallet[c.key])}</strong>{canEdit && <button className="coin-adjust" onClick={()=>setModal({type:'coins',coin:c.key})}><Plus size={15}/> Movimentar</button>}</div>)}</div><div className="history"><div className="history-title"><ScrollText size={20}/><h3>Últimas movimentações</h3></div>{moves.length ? <div className="history-list">{moves.map(m=><div className="history-row" key={m.id}><div className={`history-direction ${m.delta>0?'plus':'minus'}`}>{m.delta>0 ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</div><div className="history-description"><strong>{m.note || (m.delta>0?'Moedas adicionadas':'Moedas retiradas')}</strong><small>{new Date(m.created_at).toLocaleString('pt-BR')}</small></div><strong className={m.delta>0?'positive':'negative'}>{m.delta>0?'+':''}{formatNum(m.delta)} {m.coin.toUpperCase()}</strong></div>)}</div> : <div className="no-history">Nenhuma movimentação registrada ainda.</div>}</div></div> : <GrimorioPanel data={spellbookData} items={items} canEdit={canEdit} busy={busy} onAdd={()=>setModal({type:'spell',spell:null})} onEdit={spell=>setModal({type:'spell',spell})} onPrepare={spell=>perform(async()=>{await api.prepareSpell(spell.id,!spell.prepared);await reloadGrimorio(bagId)},spell.prepared?'Magia desmarcada.':'Magia preparada.',false)} onDelete={spell=>{if(window.confirm(`Excluir a magia ${spell.name}?`))perform(async()=>{await api.deleteSpell(spell.id);await reloadGrimorio(bagId)},'Magia removida.',false)}} onSlot={(level,total,used)=>perform(async()=>{await api.setSpellSlots(bagId,level,total,used);await reloadGrimorio(bagId)},null,false)} onConsume={spell=>{if(window.confirm(`Consumir os componentes marcados de ${spell.name}? Isso RETIRA materiais da mochila, mas NÃO gasta espaços de magia.`))perform(async()=>{await api.consumeSpellMaterials(spell.id);await Promise.all([reloadGrimorio(bagId),reloadBagData(bagId)])},'Componentes consumidos e estoque atualizado.',false)}} />}
          </div> : <div className="content-empty"><Archive size={30}/><h3>Nenhuma bolsa selecionada</h3><button className="btn btn-primary" onClick={()=>setModal({type:'createBag'})}>Criar bolsa</button></div>}
          <div className="footer-note"><ShieldCheck size={15}/> {isDemo ? 'Modo de teste: alterações salvas apenas neste navegador.' : 'Os dados são compartilhados somente com os membros da mesa.'} <span>·</span> Relicário v1.2</div>
        </>}
      </main>
    </div>
    {toast && <div className="toast"><Check size={17}/> {toast}</div>}
    {modal?.type === 'createMesa' && <MesaModal busy={busy} onClose={()=>setModal(null)} onSubmit={(name,system)=>perform(async()=>{const id=await api.createMesa(name,system);await reloadMesas(id)},'Mesa criada! Compartilhe o código de convite.')} />}
    {modal?.type === 'joinMesa' && <JoinModal busy={busy} onClose={()=>setModal(null)} onSubmit={code=>perform(async()=>{const id=await api.joinMesa(code);await reloadMesas(id)},'Bem-vindo à mesa!')} />}
    {modal?.type === 'createBag' && <BagModal busy={busy} onClose={()=>setModal(null)} onSubmit={(name,kind)=>perform(async()=>{const bag=await api.createBag(mesaId,name,kind,user.id);await reloadBags(mesaId,bag.id)},'Bolsa criada!')} />}
    {modal?.type === 'item' && <ItemModal busy={busy} item={modal.item} onClose={()=>setModal(null)} onSubmit={data=>perform(async()=>{await api.saveItem({...data,id:modal.item?.id,bag_id:bagId});await reloadBagData(bagId)}, modal.item?'Item atualizado.':'Item adicionado.')} />}
    {modal?.type === 'transfer' && <TransferModal key={modal.item.id} busy={busy} item={modal.item} sourceBag={modal.sourceBag} targets={modal.targets} onClose={()=>setModal(null)} onSubmit={(targetId,quantity)=>perform(async()=>{await api.transferItem(modal.item.id,targetId,quantity);await reloadBagData(modal.sourceBag.id)},'Item transferido com sucesso!')} />}
    {modal?.type === 'spell' && <SpellModal key={modal.spell?.id||'nova'} spell={modal.spell} items={items} busy={busy} onClose={()=>setModal(null)} onSubmit={payload=>perform(async()=>{await api.saveSpell(bagId,payload,modal.spell?.id);await reloadGrimorio(bagId)},modal.spell?'Magia atualizada.':'Magia adicionada ao grimório.')} />}
    {modal?.type === 'coins' && <CoinsModal busy={busy} coin={modal.coin} onClose={()=>setModal(null)} onSubmit={(delta,note)=>perform(async()=>{await api.adjustCoins(bagId,modal.coin,delta,note);await reloadBagData(bagId)},'Carteira atualizada!')} />}
  </div>
}

function MesaModal({busy,onClose,onSubmit}) {
  const [name,setName]=useState(''),[system,setSystem]=useState('D&D 5ª edição')
  return <Modal title="Criar uma nova mesa" subtitle="Cada aventura merece seu próprio inventário." onClose={onClose}><form className="stack-form" onSubmit={e=>{e.preventDefault();onSubmit(name.trim(),system.trim())}}><label>Nome da campanha<input autoFocus minLength={2} maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: A Maldição de Strahd" required/></label><label>Sistema de RPG<input maxLength={60} value={system} onChange={e=>setSystem(e.target.value)} placeholder="D&D, Pathfinder, Tormenta..." required/></label><div className="modal-hint"><Users size={17}/> Um baú compartilhado será criado automaticamente. Você será o mestre da mesa.</div><div className="form-actions"><button className="btn btn-outline" type="button" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy?'Criando...':'Criar mesa'} <ArrowRight size={16}/></button></div></form></Modal>
}
function JoinModal({busy,onClose,onSubmit}) {
  const [code,setCode]=useState('')
  return <Modal title="Entrar em uma mesa" subtitle="Peça ao mestre o código de convite." onClose={onClose}><form className="stack-form" onSubmit={e=>{e.preventDefault();onSubmit(code.trim().toUpperCase())}}><label>Código de convite<input autoFocus value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="EX.: A1B2C3D4E5F6" maxLength={30} required /></label><div className="modal-hint"><KeyRound size={17}/> O código permite participar da campanha e visualizar o baú compartilhado.</div><div className="form-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}> {busy?'Entrando...':'Entrar na mesa'} <ArrowRight size={16}/></button></div></form></Modal>
}
function BagModal({busy,onClose,onSubmit}) {
  const [name,setName]=useState(''),[kind,setKind]=useState('personagem')
  return <Modal title="Adicionar bolsa" subtitle="Um inventário pode ser individual ou compartilhado." onClose={onClose}><form className="stack-form" onSubmit={e=>{e.preventDefault();onSubmit(name.trim(),kind)}}><label>Nome da bolsa<input autoFocus maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Mochila de Aragorn" required /></label><div className="choice-grid"><button type="button" className={`choice-card ${kind==='personagem'?'chosen':''}`} onClick={()=>setKind('personagem')}><Package size={22}/><strong>Personagem</strong><small>Só você e o mestre editam</small></button><button type="button" className={`choice-card ${kind==='grupo'?'chosen':''}`} onClick={()=>setKind('grupo')}><Users size={22}/><strong>Grupo</strong><small>Todos da mesa podem editar</small></button></div><div className="form-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy?'Salvando...':'Criar bolsa'} <Check size={16}/></button></div></form></Modal>
}
function ItemModal({busy,item,onClose,onSubmit}) {
  const [name,setName]=useState(item?.name||''),[category,setCategory]=useState(item?.category||'Equipamentos'),[quantity,setQuantity]=useState(item?.quantity||1),[value,setValue]=useState(item?.value_po??0),[notes,setNotes]=useState(item?.notes||'')
  return <Modal title={item?'Editar item':'Adicionar item'} subtitle="Guarde os detalhes desta descoberta." onClose={onClose}><form className="stack-form" onSubmit={e=>{e.preventDefault();onSubmit({name:name.trim(),category,quantity:Number(quantity),value_po:Number(value),notes:notes.trim()})}}><label>Nome do item<input autoFocus maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Adaga de prata" required /></label><div className="form-row"><label>Categoria<select value={category} onChange={e=>setCategory(e.target.value)}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label>Quantidade<input type="number" min={1} max={1000000} step={1} value={quantity} onChange={e=>setQuantity(e.target.value)} required/></label></div><label>Valor estimado por unidade (PO)<input type="number" min={0} max={9999999999} step="0.01" value={value} onChange={e=>setValue(e.target.value)} required/></label><label>Descrição / observações<textarea rows={3} maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Origem, efeitos, propriedades, anotações..."/></label><div className="form-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy?'Salvando...':item?'Salvar alterações':'Guardar item'} <Check size={16}/></button></div></form></Modal>
}
function TransferModal({ busy, item, sourceBag, targets, onClose, onSubmit }) {
  const [targetId, setTargetId] = useState(targets[0]?.id || '')
  const [quantity, setQuantity] = useState(item.quantity)
  const amount = Number(quantity)
  const valid = !!targetId && Number.isInteger(amount) && amount >= 1 && amount <= item.quantity
  const target = targets.find(b => b.id === targetId)
  return <Modal title="Transferir item" subtitle="Transfira parte ou toda a pilha, sem perder itens." onClose={onClose}>
    <form className="stack-form" onSubmit={e=>{e.preventDefault();if(valid)onSubmit(targetId,amount)}}>
      <div className="transfer-summary"><ArrowLeftRight size={21}/><div><strong>{item.name}</strong><span>{sourceBag.name} · Disponível: {formatNum(item.quantity)}</span></div></div>
      <label>Bolsa de destino<select value={targetId} onChange={e=>setTargetId(e.target.value)} required>{targets.map(b=><option key={b.id} value={b.id}>{b.name} ({b.kind === 'grupo' ? 'Grupo' : 'Personagem'})</option>)}</select></label>
      <label>Quantidade a transferir<input type="number" min={1} max={item.quantity} step={1} value={quantity} onChange={e=>setQuantity(e.target.value)} required/></label>
      <div className="modal-hint"><Package size={17}/><span>{valid ? `${formatNum(amount)} de ${formatNum(item.quantity)} unidade(s) irão para ${target?.name}. ${amount === item.quantity ? 'O item sairá por completo da bolsa de origem.' : `${formatNum(item.quantity - amount)} permanecerá(ão) na origem.`}` : 'Escolha uma quantidade válida, sem ultrapassar o estoque.'}</span></div>
      <div className="form-actions"><button type="button" className="btn btn-outline" onClick={onClose} disabled={busy}>Cancelar</button><button className="btn btn-primary" disabled={busy || !valid}>{busy?'Transferindo...':'Confirmar transferência'} <ArrowLeftRight size={16}/></button></div>
    </form>
  </Modal>
}
function CoinsModal({busy,coin,onClose,onSubmit}) {
  const [mode,setMode]=useState('add'),[amount,setAmount]=useState(1),[note,setNote]=useState('')
  const unit = COINS.find(x=>x.key===coin)
  return <Modal title={`Movimentar ${unit?.label?.toLowerCase()||'moedas'}`} subtitle="Registre entradas e saídas de moedas no inventário." onClose={onClose}><form className="stack-form" onSubmit={e=>{e.preventDefault();onSubmit(mode==='add'?Number(amount):-Number(amount),note.trim())}}><div className="choice-grid"><button type="button" className={`choice-card ${mode==='add'?'chosen':''}`} onClick={()=>setMode('add')}><ArrowDownLeft size={22}/><strong>Adicionar</strong><small>Moedas recebidas</small></button><button type="button" className={`choice-card ${mode==='remove'?'chosen':''}`} onClick={()=>setMode('remove')}><ArrowUpRight size={22}/><strong>Retirar</strong><small>Moedas gastas ou perdidas</small></button></div><label>Quantidade ({unit?.abbr})<input type="number" min={1} max={100000000} step={1} value={amount} onChange={e=>setAmount(e.target.value)} required/></label><label>Motivo (opcional)<input maxLength={250} value={note} onChange={e=>setNote(e.target.value)} placeholder="Ex.: Recompensa da taverna" /></label><div className="form-actions"><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy}>{busy?'Salvando...':'Registrar movimento'} <Check size={16}/></button></div></form></Modal>
}

function SpellMaterialStatus({material:mat,items}) {
  const item=items.find(x=>x.id===mat.item_id)
  const enough=!!item&&Number(item.quantity)>=Number(mat.quantity)
  const required=!!mat.consumed||Number(mat.cost_gp)>0
  const hint=mat.item_id ? (enough?`Na mochila: ${item.quantity} un.`:item?`Faltam ${Number(mat.quantity)-Number(item.quantity)} un.`:'O item vinculado saiu da mochila') : required?'Vincule o item à mochila':'Sem vínculo (foco/bolsa pode substituir se permitido)'
  return <div className="spell-material-row">
    <div><strong>{mat.name}</strong><small>{mat.quantity} un. {mat.consumed?'· Consumido na conjuração':'· Reutilizável'} {Number(mat.cost_gp)>0?`· Custo exigido: ${mat.cost_gp} PO`:''}</small></div>
    <span className={`material-status ${enough?'is-ready':required?'is-missing':'is-neutral'}`}>{enough?<CheckCircle2 size={13}/>:<CircleAlert size={13}/>} {hint}</span>
  </div>
}

function SlotRow({level,slot,onSave,disabled}) {
  const [total,setTotal]=useState(slot?.total||0)
  const [used,setUsed]=useState(slot?.used||0)
  useEffect(()=>{setTotal(slot?.total||0);setUsed(slot?.used||0)},[slot?.total,slot?.used])
  const valid=Number.isInteger(Number(total))&&Number(total)>=0&&Number(total)<=30&&Number.isInteger(Number(used))&&Number(used)>=0&&Number(used)<=Number(total)
  const dirty=Number(total)!==Number(slot?.total||0)||Number(used)!==Number(slot?.used||0)
  return <div className="slot-row">
    <strong>{level}º</strong>
    <label>Total<input aria-label={`Espaços totais ${level}º círculo`} type="number" min="0" max="30" value={total} onChange={e=>setTotal(e.target.value)} /></label>
    <label>Gastos<input aria-label={`Espaços gastos ${level}º círculo`} type="number" min="0" max={total} value={used} onChange={e=>setUsed(e.target.value)}/></label>
    <span className="slot-left">{Math.max(0,Number(total)-Number(used))} livres</span>
    <button type="button" className="btn btn-outline" disabled={!dirty||!valid||disabled} onClick={()=>onSave(level,Number(total),Number(used))}>Salvar</button>
  </div>
}

function SpellCard({spell,items,canEdit,busy,onPrepare,onEdit,onDelete,onConsume}) {
  const [expanded,setExpanded]=useState(false)
  const mats=Array.isArray(spell.materials)?spell.materials:[]
  const consumed=mats.filter(m=>m.consumed)
  const costs=mats.filter(m=>m.consumed||Number(m.cost_gp)>0)
  const needsLink=costs.some(m=>!m.item_id||!items.some(x=>x.id===m.item_id&&x.quantity>=m.quantity))
  const requiredTotals=consumed.reduce((acc,m)=>{if(m.item_id)acc[m.item_id]=(acc[m.item_id]||0)+Number(m.quantity);return acc},{})
  const consumesReady=consumed.length>0&&!consumed.some(m=>!m.item_id)&&Object.entries(requiredTotals).every(([id,qty])=>items.some(x=>x.id===id&&x.quantity>=qty))
  return <article className="spell-card">
    <div className="spell-card-top">
      <div className="spell-icon"><WandSparkles size={21}/></div>
      <div className="spell-name"><small>{SPELL_LEVEL(spell.level)} · {spell.school||'Escola não informada'}</small><h3>{spell.name}</h3></div>
      {spell.level===0?<span className="spell-pill">Truque</span>:<span className={`spell-pill ${spell.prepared?'spell-prepared':''}`}>{spell.prepared?'Preparada':'Não preparada'}</span>}
    </div>
    <div className="spell-tags"><span>{spell.casting_time||'Tempo não informado'}</span><span>{spell.range_text||'Alcance não informado'}</span><span>{[spell.verbal?'V':null,spell.somatic?'S':null,spell.material?'M':null].filter(Boolean).join(' / ')||'Sem V/S/M'}</span>{spell.ritual&&<span>Ritual</span>}{spell.concentration&&<span>Concentração</span>}</div>
    <div className="spell-card-actions"><button className="spell-expand" onClick={()=>setExpanded(v=>!v)}><ChevronDown size={17} className={expanded?'rotated':''}/>{expanded?'Ocultar ficha':'Ver ficha completa'}</button>
      {canEdit&&<div className="spell-controls">{spell.level>0&&<button className={`mini-prepare ${spell.prepared?'on':''}`} disabled={busy} onClick={()=>onPrepare(spell)}><Check size={14}/>{spell.prepared?'Preparada':'Preparar'}</button>}<button className="icon-button" disabled={busy} title="Editar magia" onClick={()=>onEdit(spell)}><Pencil size={16}/></button><button className="icon-button danger-muted" disabled={busy} title="Excluir magia" onClick={()=>onDelete(spell)}><Trash2 size={16}/></button></div>}
    </div>
    {expanded&&<div className="spell-details">
      <div className="spell-facts"><div><small>Conjuração</small><strong>{spell.casting_time||'—'}</strong></div><div><small>Alcance</small><strong>{spell.range_text||'—'}</strong></div><div><small>Duração</small><strong>{spell.duration_text||'—'} {spell.concentration?'(Concentração)':''}</strong></div><div><small>Componentes</small><strong>{[spell.verbal?'Verbal (V)':null,spell.somatic?'Somático (S)':null,spell.material?'Material (M)':null].filter(Boolean).join(', ')||'—'}</strong></div></div>
      <div className="spell-description"><h4>Efeito da magia</h4><p>{spell.description||'Descrição ainda não cadastrada.'}</p>{spell.higher_levels&&<><h4>Em círculos superiores</h4><p>{spell.higher_levels}</p></>}{spell.notes&&<><h4>Notas</h4><p>{spell.notes}</p></>}</div>
      <div className="spell-materials"><h4><FlaskConical size={17}/> Componentes materiais vinculados</h4>{mats.length?mats.map((m,i)=><SpellMaterialStatus key={i} material={m} items={items}/>):<p className="spell-muted">Nenhum material cadastrado nesta ficha.</p>}
        {needsLink&&<p className="spell-warning">Materiais com custo específico ou consumidos precisam estar disponíveis. Materiais comuns podem ser substituídos por foco/bolsa de componentes quando as regras permitirem.</p>}
        {canEdit&&consumed.length>0&&<button className="btn btn-outline" disabled={busy||!consumesReady} onClick={()=>onConsume(spell)}><FlaskConical size={15}/> Consumir materiais ({consumed.length})</button>}
        {consumed.length>0&&<p className="spell-muted">A baixa retira apenas os itens consumidos. Espaços de magia são controlados separadamente.</p>}
      </div>
    </div>}
  </article>
}

function GrimorioPanel({data,items,canEdit,busy,onAdd,onEdit,onPrepare,onDelete,onSlot,onConsume}) {
  const [searchSpell,setSearchSpell]=useState('')
  const [mode,setMode]=useState('todas')
  const [level,setLevel]=useState('todos')
  const [showSlots,setShowSlots]=useState(false)
  const spells=data.spells||[]
  const filtered=spells.filter(s=>(mode!=='preparadas'||s.prepared||s.level===0)&&(level==='todos'||Number(level)===s.level)&&cleanName(s.name+' '+s.school).includes(cleanName(searchSpell)))
  const prepared=spells.filter(s=>s.prepared&&s.level>0).length
  return <div className="grimorio-content">
    <div className="grimorio-header"><div><span className="eyebrow">MAGIA & CONHECIMENTO</span><h3><BookMarked size={23}/> Grimório do personagem</h3><p>{spells.length} magia(s) registrada(s) · {prepared} preparada(s) · {spells.filter(s=>s.level===0).length} truque(s)</p></div>{canEdit&&<button className="btn btn-primary" onClick={onAdd}><Plus size={17}/> Nova magia</button>}</div>
    <div className="spell-slot-box"><div className="spell-slot-header"><div><strong>Espaços de magia</strong><span>Controle manual por círculo, de acordo com classe e nível do personagem.</span></div><button className="btn btn-outline" onClick={()=>setShowSlots(v=>!v)}><Coins size={15}/>{showSlots?'Recolher':'Configurar / acompanhar'}</button></div>
    <div className="slot-chip-strip">{Array.from({length:9},(_,i)=>i+1).filter(n=>Number(data.book?.slots?.[n]?.total||0)>0).map(n=><span key={n} className="slot-chip">{n}º: <strong>{Math.max(0,Number(data.book.slots[n].total)-Number(data.book.slots[n].used))}/{data.book.slots[n].total}</strong></span>)}{!Array.from({length:9},(_,i)=>i+1).some(n=>Number(data.book?.slots?.[n]?.total||0)>0)&&<span className="spell-muted">Configure seus espaços quando desejar. Truques não gastam espaços.</span>}</div>
    {showSlots&&<div className="spell-slots-edit">{Array.from({length:9},(_,i)=>i+1).map(n=><SlotRow key={n} level={n} slot={data.book?.slots?.[n]} onSave={onSlot} disabled={!canEdit||busy}/>)}</div>}</div>
    <div className="spell-filter"><div className="search-wrap"><Search size={17}/><input aria-label="Buscar magias" value={searchSpell} onChange={e=>setSearchSpell(e.target.value)} placeholder="Pesquisar magia ou escola..."/></div><select aria-label="Filtrar preparação" value={mode} onChange={e=>setMode(e.target.value)}><option value="todas">Todas as magias</option><option value="preparadas">Preparadas + truques</option></select><select aria-label="Filtrar círculo" value={level} onChange={e=>setLevel(e.target.value)}><option value="todos">Todos os círculos</option>{Array.from({length:10},(_,n)=><option key={n} value={n}>{SPELL_LEVEL(n)}</option>)}</select></div>
    <div className="spell-list">{filtered.length?filtered.map(spell=><SpellCard key={spell.id} spell={spell} items={items} canEdit={canEdit} busy={busy} onPrepare={onPrepare} onEdit={onEdit} onDelete={onDelete} onConsume={onConsume}/>):<div className="spell-empty"><BookMarked size={33}/><h4>{spells.length?'Nenhuma magia neste filtro':'Seu grimório está vazio'}</h4><p>{spells.length?'Ajuste a pesquisa ou os filtros.':'Cadastre suas magias, marque as preparadas e vincule materiais à mochila.'}</p></div>}</div>
    {!!data.usage?.length&&<div className="spell-usage"><h4>Últimos materiais consumidos</h4>{data.usage.slice(0,8).map(u=><p key={u.id}>{u.quantity}× {u.item_name} — {u.spell_name} <small>{new Date(u.created_at).toLocaleString('pt-BR')}</small></p>)}</div>}
    <p className="spell-rule-note">O grimório serve para organização; não valida automaticamente regras específicas de classe, rituais, componentes V/S, foco arcano ou limite de preparação. Confirme com o mestre. As fichas são preenchidas pelos jogadores, sem catálogo de textos protegidos.</p>
  </div>
}

function SpellModal({spell,items,busy,onClose,onSubmit}) {
  const [f,setF]=useState({name:spell?.name||'',level:spell?.level??1,school:spell?.school||'Evocação',casting_time:spell?.casting_time||'1 ação',range_text:spell?.range_text||'',duration_text:spell?.duration_text||'',verbal:spell?.verbal??true,somatic:spell?.somatic??true,material:spell?.material??false,ritual:spell?.ritual??false,concentration:spell?.concentration??false,prepared:spell?.prepared??false,description:spell?.description||'',higher_levels:spell?.higher_levels||'',notes:spell?.notes||''})
  const [mats,setMats]=useState(Array.isArray(spell?.materials)?spell.materials:[])
  const update=(key,value)=>setF(v=>({...v,[key]:value}))
  const updateMat=(i,key,value)=>setMats(prev=>prev.map((m,j)=>j===i?{...m,[key]:value}:m))
  const addMat=()=>{setMats(a=>[...a,{name:'',item_id:'',quantity:1,cost_gp:0,consumed:false}]);update('material',true)}
  const suggestMat=i=>{const m=mats[i];if(m?.item_id||!m?.name?.trim())return;const found=items.filter(x=>cleanName(x.name)===cleanName(m.name));if(found.length===1)updateMat(i,'item_id',found[0].id)}
  const valid=f.name.trim()&&mats.every(m=>m.name.trim()&&Number.isInteger(Number(m.quantity))&&Number(m.quantity)>0&&Number(m.cost_gp)>=0)&&mats.length<=20
  function submit(e){e.preventDefault();if(!valid)return;onSubmit({...f,name:f.name.trim(),level:Number(f.level),materials:mats.map(m=>({...m,name:m.name.trim(),item_id:m.item_id||null,quantity:Number(m.quantity),cost_gp:Number(m.cost_gp)||0})),material:f.material||mats.length>0})}
  return <Modal title={spell?'Editar magia':'Registrar nova magia'} subtitle="Ficha inspirada nos campos da 5ª edição. Preencha com as regras da sua mesa." onClose={onClose}><form className="stack-form spell-form" onSubmit={submit}>
    <label>Nome da magia<input autoFocus required maxLength="120" value={f.name} onChange={e=>update('name',e.target.value)} placeholder="Ex.: Proteção Arcana"/></label>
    <div className="form-row"><label>Círculo<select value={f.level} onChange={e=>update('level',Number(e.target.value))}>{Array.from({length:10},(_,n)=><option key={n} value={n}>{SPELL_LEVEL(n)}</option>)}</select></label><label>Escola<select value={f.school} onChange={e=>update('school',e.target.value)}>{SCHOOLS.map(s=><option key={s}>{s}</option>)}</select></label></div>
    <div className="form-row"><label>Tempo de conjuração<input maxLength="160" value={f.casting_time} onChange={e=>update('casting_time',e.target.value)} placeholder="1 ação / 1 ação bônus"/></label><label>Alcance<input maxLength="160" value={f.range_text} onChange={e=>update('range_text',e.target.value)} placeholder="18 metros / Toque"/></label></div>
    <label>Duração<input maxLength="160" value={f.duration_text} onChange={e=>update('duration_text',e.target.value)} placeholder="Instantânea / Até 1 minuto"/></label>
    <div className="spell-check-grid">{[['verbal','Verbal (V)'],['somatic','Somático (S)'],['material','Material (M)'],['ritual','Ritual'],['concentration','Concentração'],['prepared','Preparada']].map(([key,label])=><label key={key}><input type="checkbox" checked={!!f[key]} onChange={e=>update(key,e.target.checked)}/>{label}</label>)}</div>
    <label>Descrição / efeito da magia<textarea rows={5} maxLength={12000} value={f.description} onChange={e=>update('description',e.target.value)} placeholder="Registre o efeito, testes, dano, salvaguardas e condições, conforme seu material de referência."/></label>
    <label>Em círculos superiores<textarea rows={2} maxLength={4000} value={f.higher_levels} onChange={e=>update('higher_levels',e.target.value)} placeholder="Como a magia muda com um espaço de círculo maior?"/></label>
    <label>Observações<textarea rows={2} maxLength={4000} value={f.notes} onChange={e=>update('notes',e.target.value)} placeholder="Classes, fonte, condição de conjuração ou regras da mesa"/></label>
    <div className="spell-material-editor"><div className="spell-editor-title"><div><strong><FlaskConical size={17}/> Componentes materiais</strong><p>Associe cada material a um item real da mochila para acompanhar a quantidade.</p></div><button type="button" className="btn btn-outline" disabled={mats.length>=20} onClick={addMat}><Plus size={14}/> Adicionar</button></div>
    {mats.map((mat,i)=><div key={i} className="spell-mat-edit"><div className="spell-mat-top"><strong>Material {i+1}</strong><button className="icon-button danger-muted" type="button" title="Remover material" onClick={()=>setMats(a=>a.filter((_,j)=>i!==j))}><X size={15}/></button></div><label>Material exigido<input required maxLength="120" value={mat.name} onBlur={()=>suggestMat(i)} onChange={e=>updateMat(i,'name',e.target.value)} placeholder="Ex.: pó de diamante"/></label><label>Item correspondente na mochila<select value={mat.item_id||''} onChange={e=>updateMat(i,'item_id',e.target.value)}><option value="">Não vinculado</option>{items.map(item=><option key={item.id} value={item.id}>{item.name} — {item.quantity} un. ({item.category})</option>)}</select></label><div className="form-row"><label>Qtd. por uso<input type="number" min="1" max="1000000" value={mat.quantity} onChange={e=>updateMat(i,'quantity',e.target.value)}/></label><label>Custo exigido (PO)<input type="number" min="0" step="0.01" value={mat.cost_gp} onChange={e=>updateMat(i,'cost_gp',e.target.value)}/></label></div><label className="material-checkbox"><input type="checkbox" checked={!!mat.consumed} onChange={e=>updateMat(i,'consumed',e.target.checked)}/> Este material é consumido pela magia</label></div>)}
    {!mats.length&&<p className="spell-muted">Nenhum material detalhado. Você pode cadastrar componentes depois.</p>}</div>
    <div className="modal-hint"><BookOpen size={17}/><span>Foco arcano e bolsa de componentes podem substituir materiais sem custo e não consumidos, conforme a classe e as regras usadas. Consumíveis só serão descontados quando você confirmar a baixa.</span></div>
    <div className="form-actions"><button type="button" className="btn btn-outline" disabled={busy} onClick={onClose}>Cancelar</button><button className="btn btn-primary" disabled={busy||!valid}>{busy?'Salvando...':'Salvar magia'}<Check size={16}/></button></div>
  </form></Modal>
}

export default App
