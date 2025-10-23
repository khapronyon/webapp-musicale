import './globals.css'
import ToastContainer from './components/ToastContainer'

export const metadata = {
  title: 'MusicHub - Scopri la tua musica',
  description: 'Segui artisti, scopri release e rimani aggiornato sulla musica che ami',
}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  )
}