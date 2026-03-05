import type { Metadata } from 'next'
import './globals.css'
import { FinanceProvider } from '@/contexts/FinanceContext'

export const metadata: Metadata = {
  title: 'Sistema Financeiro',
  description: 'Sistema de gestão financeira pessoal',
}

export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <FinanceProvider>
          {children}
        </FinanceProvider>
      </body>
    </html>
  )
}
