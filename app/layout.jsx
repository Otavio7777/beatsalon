import './globals.css'

export const metadata = {
  title: 'BeatSalon',
  description: 'Gestão de relacionamento para salões e barbearias',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
