export interface BillingLocation {
  id: string
  created_at: number
  location_id: string
  name: string
  email: string | null
  account_type: string | null
  stripe_customerId: string | null
  isFound: boolean
  saas_mode: string | null
  subscription_plan: string | null
  subscription_status: string | null
  isPaused: boolean
  pause_message: string | null
  lastUpdated: number
  agency_id: string
  agency_name: string
}

export interface BillingResponse {
  itemsReceived: number
  curPage: number
  nextPage: number | null
  prevPage: number | null
  offset: number
  perPage: number
  itemsTotal: number
  pageTotal: number
  items: BillingLocation[]
}

export type BillingSortField =
  | 'name'
  | 'location_id'
  | 'email'
  | 'account_type'
  | 'stripe_customerId'
  | 'subscription_plan'
  | 'subscription_status'
  | 'saas_mode'
  | 'isPaused'
  | 'agency_name'
  | 'lastUpdated'

export type BillingSortDirection = 'asc' | 'desc'

export type FilterOp = '==' | '!=' | 'ilike' | 'not ilike'

export interface FilterRow {
  id: string
  field: string
  op: FilterOp
  value: string
}

export interface XanoFilterExpression {
  expression: Array<{
    statement: {
      left: { tag: 'col'; operand: string }
      op: FilterOp
      right: { operand: string }
    }
  }>
}

function toOperand(op: FilterOp, value: string): string {
  return op === 'ilike' || op === 'not ilike' ? `%${value}%` : value
}

export function buildFilterExpression(rows: FilterRow[]): XanoFilterExpression | null {
  const complete = rows.filter((r) => r.field && r.value.trim())
  if (complete.length === 0) return null
  return {
    expression: complete.map((r) => ({
      statement: {
        left: { tag: 'col', operand: r.field },
        op: r.op,
        right: { operand: toOperand(r.op, r.value.trim()) },
      },
    })),
  }
}

export type FilterField = { field: string; label: string; type: 'text' | 'bool' }

export const FILTERABLE_FIELDS: FilterField[] = [
  { field: 'name', label: 'Name', type: 'text' },
  { field: 'email', label: 'Email', type: 'text' },
  { field: 'account_type', label: 'Account Type', type: 'text' },
  { field: 'stripe_customerId', label: 'Stripe Customer ID', type: 'text' },
  { field: 'subscription_plan', label: 'Plan', type: 'text' },
  { field: 'subscription_status', label: 'Subscription Status', type: 'text' },
  { field: 'saas_mode', label: 'SaaS Mode', type: 'text' },
  { field: 'agency_name', label: 'Agency', type: 'text' },
  { field: 'isPaused', label: 'Is Paused', type: 'bool' },
]

export const TEXT_OPS: Array<{ op: FilterOp; label: string }> = [
  { op: '==', label: 'equals' },
  { op: '!=', label: 'not equals' },
  { op: 'ilike', label: 'contains' },
  { op: 'not ilike', label: 'not contains' },
]

export const BOOL_OPS: Array<{ op: FilterOp; label: string }> = [{ op: '==', label: 'equals' }]

export interface BillingQuery {
  page: number
  perPage: number
  search?: string
  warningOnly?: boolean
  sort: Record<string, BillingSortDirection>
  filterExpression?: XanoFilterExpression
}