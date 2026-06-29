export interface IntegrationLocation {
  id: string
  created_at: number
  location_id: string
  name: string
  isFound: boolean
  PIT: string | null
  pit_status: boolean
  pit_message: string | null
  saas_mode: string | null
  subscription_plan: string | null
  subscription_status: string | null
  isPaused: boolean
  pause_message: string | null
  lastUpdated: number | null
  agency_id: string
  agency_name: string
}

export interface IntegrationResponse {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: IntegrationLocation[]
}

export type IntegrationSortField =
  | 'name'
  | 'location_id'
  | 'PIT'
  | 'pit_status'
  | 'pit_message'
  | 'saas_mode'
  | 'subscription_plan'
  | 'subscription_status'
  | 'isPaused'
  | 'agency_name'
  | 'lastUpdated'

export type IntegrationSortDirection = 'asc' | 'desc'

import type { FilterField, XanoFilterExpression } from './billing'
export type { FilterField }

export const INTEGRATION_FILTERABLE_FIELDS: FilterField[] = [
  { field: 'name', label: 'Name', type: 'text' },
  { field: 'pit_status', label: 'PIT Status', type: 'bool' },
  { field: 'pit_message', label: 'PIT Message', type: 'text' },
  { field: 'saas_mode', label: 'SaaS Mode', type: 'text' },
  { field: 'subscription_plan', label: 'Plan', type: 'text' },
  { field: 'subscription_status', label: 'Subscription Status', type: 'text' },
  { field: 'isPaused', label: 'Is Paused', type: 'bool' },
  { field: 'agency_name', label: 'Agency', type: 'text' },
]

export interface IntegrationQuery {
  page: number
  perPage: number
  search?: string
  sort: Record<string, string>
  filterExpression?: XanoFilterExpression
}
