import { useState } from 'react'
import { ABILITIES, defaultSheet, mod, signed } from './characterRules.js'

const STEPS = [
  { title: 'Identidade', description: 'Quem é seu personagem?' },
  { title: 'Atributos', description: 'Quais são seus pontos fortes?' },
  { title: 'Revisão', description: 'Confira antes de criar.' },
]

const HELP = {
  str: 'Força física: Atletismo, ataques e dano de certas armas.',
  dex: 'Agilidade: iniciativa, Furtividade e defesa em algumas armaduras.',
  con: 'Resistência física: pontos de vida e testes de Constituição.',
  int: 'Raciocínio e conhecimento: Arcanismo, História e Investigação.',
  wis: 'Atenção e intuição: Percepção, Intuição e Sobrevivência.',
  cha: 'Presença social: Persuasão, Enganação e Atuação.',
}

export default function CharacterCreationWizard({ bag, busy, onSave }) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => defaultSheet(
    bag.id,
    (bag.name || '').replace(/^Bolsa de\s+/i, '')
  ))

  const update = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const updateAbility = (key, value) => setForm(current => ({
    ...current,
    abilities: { ...current.abilities, [key]: value === '' ? '' : Number(value) },
  }))

  function validate() {
    if (!form.name.trim()) return 'Informe o nome do personagem.'
    if (ABILITIES.some(({ key }) => !Number.isInteger(Number(form.abilities[key])) ||
      Number(form.abilities[key]) < 1 || Number(form.abilities[key]) > 30)) {
      return 'Cada atributo precisa ter um valor inteiro entre 1 e 30.'
    }
    return ''
  }

  function next() {
    const message = validate()
    if (message) { setError(message); return }
    setError('')
    setStep(current => Math.min(current + 1, STEPS.length - 1))
  }

  async function create() {
    const message = validate()
    if (message) { setError(message); return }
    setError('')
    try {
      const success = await onSave(form)
      if (!success) setError('Não foi possível criar a ficha. Confira o aviso do Relicário e tente novamente.')
    } catch (reason) {
      setError(reason?.message || 'Não foi possível criar a ficha.')
    }
  }

  return (
    <div className="character-editor">
      <div className="character-editor-header">
        <div>
          <span className="eyebrow">RELICÁRIO · FICHA HÍBRIDA 2024</span>
          <h3>Criar personagem</h3>
          <p>Comece pelo essencial. Depois de criar, você poderá editar todos os detalhes na ficha completa.</p>
        </div>
      </div>

      <nav aria-label="Etapas de criação" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
        {STEPS.map((item, index) => (
          <span
            key={item.title}
            aria-current={step === index ? 'step' : undefined}
            className={step === index ? 'btn btn-primary' : 'btn btn-outline'}
            style={{ cursor: 'default', pointerEvents: 'none' }}
          >
            {index + 1}. {item.title}
          </span>
        ))}
      </nav>

      {step === 0 && (
        <section className="character-edit-section">
          <h4>{STEPS[0].description}</h4>
          <p className="character-muted">Esses campos são livres nesta primeira etapa da v1.4. As opções automáticas das regras de 2024 virão depois.</p>
          <div className="character-edit-grid">
            <label className="character-field">
              <span>Nome do personagem *</span>
              <input
                maxLength={120}
                value={form.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Ex.: Kael"
              />
            </label>
            <label className="character-field">
              <span>Classe</span>
              <input
                maxLength={160}
                value={form.class_name}
                onChange={e => update('class_name', e.target.value)}
                placeholder="Ex.: Guerreiro"
              />
            </label>
            <label className="character-field">
              <span>Espécie</span>
              <input
                maxLength={120}
                value={form.species}
                onChange={e => update('species', e.target.value)}
                placeholder="Ex.: Humano"
              />
            </label>
            <label className="character-field">
              <span>Antecedente</span>
              <input
                maxLength={120}
                value={form.background}
                onChange={e => update('background', e.target.value)}
                placeholder="Ex.: Soldado"
              />
            </label>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="character-edit-section">
          <h4>{STEPS[1].description}</h4>
          <p className="character-muted">
            Informe os valores finais dos seis atributos. Por enquanto, a distribuição e os ajustes de origem são manuais;
            o Relicário calcula os modificadores automaticamente.
          </p>
          <div className="character-ability-editor">
            {ABILITIES.map(ability => (
              <div className="character-ability-input" key={ability.key}>
                <label htmlFor={`wizard-${ability.key}`}>{ability.short}</label>
                <input
                  id={`wizard-${ability.key}`}
                  aria-label={ability.label}
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  value={form.abilities[ability.key]}
                  onChange={e => updateAbility(ability.key, e.target.value)}
                />
                <strong>{form.abilities[ability.key] === '' ? '—' : signed(mod(form.abilities[ability.key]))}</strong>
                <small title={HELP[ability.key]}>{ability.label}</small>
              </div>
            ))}
          </div>
          <p className="character-muted">Dica: passe o cursor sobre o nome do atributo para ler sua explicação.</p>
        </section>
      )}

      {step === 2 && (
        <section className="character-edit-section">
          <h4>{STEPS[2].description}</h4>
          <div className="character-edit-grid">
            <div><small>Nome</small><p><strong>{form.name}</strong></p></div>
            <div><small>Classe</small><p><strong>{form.class_name || 'A definir'}</strong></p></div>
            <div><small>Espécie</small><p><strong>{form.species || 'A definir'}</strong></p></div>
            <div><small>Antecedente</small><p><strong>{form.background || 'A definir'}</strong></p></div>
            <div><small>Nível</small><p><strong>1</strong></p></div>
          </div>
          <div className="character-ability-row">
            {ABILITIES.map(ability => (
              <div className="character-ability" key={ability.key}>
                <span>{ability.short}</span>
                <strong>{signed(mod(form.abilities[ability.key]))}</strong>
                <small>{form.abilities[ability.key]}</small>
              </div>
            ))}
          </div>
          <p className="character-muted">
            Os demais campos começam com os valores padrão da ficha v1.3. Antes de jogar, complete PV,
            proficiências, perícias, Classe de Armadura e características na edição completa.
          </p>
        </section>
      )}

      {error && <p role="alert" className="inline-message">{error}</p>}
      <div className="character-editor-actions">
        {step > 0 && (
          <button type="button" className="btn btn-outline" disabled={busy}
            onClick={() => { setError(''); setStep(current => current - 1) }}>
            Voltar
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={next} disabled={busy}>Próximo passo</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={create} disabled={busy}>
            {busy ? 'Criando...' : 'Criar ficha'}
          </button>
        )}
      </div>
    </div>
  )
}
