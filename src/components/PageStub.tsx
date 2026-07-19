import { ReactNode } from 'react'

export default function PageStub({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <div className="page">
      <header className="page-head">
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </header>
      <div className="stub-card">
        <span className="stub-badge">În curând</span>
        <div>{children}</div>
      </div>
    </div>
  )
}
