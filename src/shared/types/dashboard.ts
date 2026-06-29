export type PolicyStatus = 'Active' | 'Pending' | 'Needs Review'

export interface Policy {
  id: string
  clientName: string
  policyType: string
  premiumMonthly: number
  status: PolicyStatus
  renewalDate: string
}

export interface Activity {
  id: string
  message: string
  timestamp: string
}

export interface OverviewStats {
  activePolicies: number
  monthlyRevenue: number
  pendingApprovals: number
  renewalsThisMonth: number
}

export interface DashboardData {
  stats: OverviewStats
  policies: Policy[]
  activities: Activity[]
}
