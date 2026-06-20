import { redirect } from 'next/navigation'
export default function RelatorioPage() {
  redirect('/dashboard/financeiro?tab=relatorio')
}
