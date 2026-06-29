import { mockDashboardData } from './mockData'
import type { DashboardData } from '../shared/types/dashboard'

const USE_MOCK_API = true

export async function fetchDashboardData(): Promise<DashboardData> {
  if (USE_MOCK_API) {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockDashboardData), 300)
    })
  }

  throw new Error('Real API is not connected yet.')
}
