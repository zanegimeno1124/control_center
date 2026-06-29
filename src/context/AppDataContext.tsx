import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchDashboardData } from '../services/dashboardService'
import type { DashboardData } from '../shared/types/dashboard'

interface AppDataState {
  data: DashboardData | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const AppDataContext = createContext<AppDataState | undefined>(undefined)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchDashboardData()
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const contextValue = useMemo(
    () => ({
      data,
      isLoading,
      error,
      refresh: load,
    }),
    [data, isLoading, error],
  )

  return <AppDataContext.Provider value={contextValue}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)

  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider.')
  }

  return context
}
