import './index.css'
import { registerHiraethPalette } from './hiraeth/palette'
import { CityProvider } from './ui/CityContext'
import { AppShell } from './ui/AppShell'

registerHiraethPalette()

export default function App() {
  return (
    <CityProvider>
      <AppShell />
    </CityProvider>
  )
}
