import './index.css'
import { CityProvider } from './ui/CityContext'
import { AppShell } from './ui/AppShell'

export default function App() {
  return (
    <CityProvider>
      <AppShell />
    </CityProvider>
  )
}
