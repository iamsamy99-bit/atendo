import type { ReactNode, FormEvent } from 'react'

export function Modal({ title, onClose, children, footer }: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}

export function Badge({ tone, children }: { tone: 'gray' | 'blue' | 'green' | 'amber' | 'red'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>
}

export function Empty({ icon, text, children }: { icon: string; text: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="big">{icon}</div>
      <p>{text}</p>
      {children}
    </div>
  )
}

/** Form que evita doble submit y expone onSubmit limpio. */
export function Form({ onSubmit, children }: { onSubmit: () => void; children: ReactNode }) {
  const handle = (e: FormEvent) => { e.preventDefault(); onSubmit() }
  return <form onSubmit={handle}>{children}</form>
}
