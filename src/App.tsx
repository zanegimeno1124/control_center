import { AppDataProvider } from './context/AppDataContext'
import { PolicyHub } from './features/policy-hub/PolicyHub'

function App() {
  return (
    <AppDataProvider>
      <PolicyHub />
    </AppDataProvider>
  )
}

export default App
