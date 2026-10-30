import { useEffect, useState } from 'react'
import type { ChamaApi } from '../shared/ipc'

declare global {
  interface Window {
    chama: ChamaApi
  }
}

function App() {
  const [status, setStatus] = useState('checking main process…')

  useEffect(() => {
    window.chama
      ?.ping()
      .then((res) => setStatus(`${res.message} (${new Date(res.timestamp).toLocaleTimeString()})`))
      .catch((err: unknown) => setStatus(`IPC error: ${String(err)}`))
  }, [])

  return (
    <main>
      <h1>Chama Assistant</h1>
      <p>Offline-first meeting minutes, ledger, and payouts for savings groups.</p>
      <p>Main process says: {status}</p>
    </main>
  )
}

export default App
