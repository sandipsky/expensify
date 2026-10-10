import type { ReactNode } from 'react'
import './AuthCard.scss'

interface AuthCardProps {
  title: string
  /** A line under the title. */
  subtitle?: string
  children: ReactNode
}

/**
 * The centred card the login and signup pages sit in: the brand, a heading,
 * an optional line under it, then the page's own content. Its stylesheet also
 * holds the form, link and note styles both pages share.
 */
export const AuthCard = ({ title, subtitle, children }: AuthCardProps) => (
  <div className="auth-page">
    <main className="auth-card">
      <span className="auth-card__brand">Expensify</span>
      <h1 className="auth-card__title">{title}</h1>
      {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
      {children}
    </main>
  </div>
)
