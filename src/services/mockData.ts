import type { Activity, DashboardData, Policy } from '../shared/types/dashboard'

const policies: Policy[] = [
  {
    id: 'POL-1034',
    clientName: 'Avery Logistics',
    policyType: 'General Liability',
    premiumMonthly: 720,
    status: 'Active',
    renewalDate: '2026-06-12',
  },
  {
    id: 'POL-1088',
    clientName: 'Northside Dental Group',
    policyType: 'Professional Liability',
    premiumMonthly: 530,
    status: 'Pending',
    renewalDate: '2026-04-20',
  },
  {
    id: 'POL-1121',
    clientName: 'Ridgeview Apartments',
    policyType: 'Commercial Property',
    premiumMonthly: 1180,
    status: 'Active',
    renewalDate: '2026-05-01',
  },
  {
    id: 'POL-1175',
    clientName: 'Oak & Ember Bistro',
    policyType: 'Business Owner Policy',
    premiumMonthly: 460,
    status: 'Needs Review',
    renewalDate: '2026-04-18',
  },
]

const activities: Activity[] = [
  { id: 'ACT-1', message: 'Renewal quote generated for Ridgeview Apartments', timestamp: '10m ago' },
  { id: 'ACT-2', message: 'New application submitted by Northside Dental Group', timestamp: '35m ago' },
  { id: 'ACT-3', message: 'Policy documents sent to Avery Logistics', timestamp: '1h ago' },
  { id: 'ACT-4', message: 'Underwriting notes updated for Oak & Ember Bistro', timestamp: '2h ago' },
]

export const mockDashboardData: DashboardData = {
  stats: {
    activePolicies: policies.filter((policy) => policy.status === 'Active').length,
    monthlyRevenue: policies.reduce((sum, policy) => sum + policy.premiumMonthly, 0),
    pendingApprovals: policies.filter((policy) => policy.status === 'Pending').length,
    renewalsThisMonth: policies.filter((policy) => policy.renewalDate.startsWith('2026-04')).length,
  },
  policies,
  activities,
}
