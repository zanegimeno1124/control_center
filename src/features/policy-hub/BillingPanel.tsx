import { type ReactNode, useEffect, useState } from 'react'
import { fetchBillingLocations, pauseBillingLocations } from '../../services/billingService'
import type {
  BillingLocation,
  BillingResponse,
  BillingSortDirection,
  BillingSortField,
  FilterRow,
} from '../../shared/types/billing'
import { FILTERABLE_FIELDS, buildFilterExpression } from '../../shared/types/billing'
import { FilterBuilderModal } from './FilterBuilderModal'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
type LocationStatusView = 'active' | 'paused' | 'deleted' | 'needsAttention'
type LocationColumn = {
  key: string
  label: string
  sortKey?: BillingSortField
  render: (item: BillingLocation) => ReactNode
}

const STATUS_VIEWS: Array<{
  key: LocationStatusView
  label: string
  summaryLabel: string
  footerLabel: string
  warningOnly?: boolean
  filters: FilterRow[]
}> = [
  {
    key: 'active',
    label: 'Active',
    summaryLabel: 'active locations',
    footerLabel: 'Active locations',
    filters: [
      { id: 'status-active-found', field: 'isFound', op: '==', value: 'true' },
      { id: 'status-active-paused', field: 'isPaused', op: '==', value: 'false' },
    ],
  },
  {
    key: 'paused',
    label: 'Paused',
    summaryLabel: 'paused locations',
    footerLabel: 'Paused locations',
    filters: [{ id: 'status-paused', field: 'isPaused', op: '==', value: 'true' }],
  },
  {
    key: 'deleted',
    label: 'Deleted',
    summaryLabel: 'deleted locations',
    footerLabel: 'Deleted locations',
    filters: [{ id: 'status-deleted', field: 'isFound', op: '==', value: 'false' }],
  },
  {
    key: 'needsAttention',
    label: 'Needs Attention',
    summaryLabel: 'attention items',
    footerLabel: 'Needs Attention',
    warningOnly: true,
    filters: [],
  },
]

const LOCATION_COLUMN: LocationColumn = {
  key: 'location',
  label: 'Location',
  sortKey: 'name',
  render: (item) => (
    <MergedCell
      primary={item.name || 'Unnamed location'}
      secondary={item.location_id || 'N/A'}
      secondaryMono
    />
  ),
}

const AGENCY_COLUMN: LocationColumn = {
  key: 'agency',
  label: 'Agency',
  sortKey: 'agency_name',
  render: (item) => <MergedCell primary={item.agency_name || 'N/A'} secondary={item.account_type || 'N/A'} />,
}

const PLAN_COLUMN: LocationColumn = {
  key: 'plan',
  label: 'Plan',
  sortKey: 'subscription_plan',
  render: (item) => (
    <MergedCell
      primary={item.subscription_plan || 'Unassigned'}
      secondary={item.stripe_customerId || 'N/A'}
      secondaryMono
    />
  ),
}

const SUBSCRIPTION_COLUMN: LocationColumn = {
  key: 'subscription',
  label: 'Subscription',
  sortKey: 'subscription_status',
  render: (item) => (
    <span className={`status ${getStatusTone(item.subscription_status)}`}>
      {item.subscription_status || 'None'}
    </span>
  ),
}

const SAAS_MODE_COLUMN: LocationColumn = {
  key: 'saasMode',
  label: 'SaaS Mode',
  sortKey: 'saas_mode',
  render: (item) => (
    <span className={`status ${item.saas_mode === 'activated' ? 'active' : 'pending'}`}>
      {item.saas_mode || 'None'}
    </span>
  ),
}

const PAUSE_COLUMN: LocationColumn = {
  key: 'pause',
  label: 'Paused',
  sortKey: 'isPaused',
  render: (item) => (
    <div className="pause-cell">
      <span className={`status ${item.isPaused ? 'needs-review' : 'active'}`}>
        {item.isPaused ? 'Paused' : 'Active'}
      </span>
      {item.pause_message && <small>{item.pause_message}</small>}
    </div>
  ),
}

const STANDARD_COLUMNS = [LOCATION_COLUMN, AGENCY_COLUMN, PLAN_COLUMN, SUBSCRIPTION_COLUMN, SAAS_MODE_COLUMN]
const COLUMNS_BY_STATUS: Record<LocationStatusView, LocationColumn[]> = {
  active: STANDARD_COLUMNS,
  paused: [...STANDARD_COLUMNS, PAUSE_COLUMN],
  deleted: [LOCATION_COLUMN, AGENCY_COLUMN, PLAN_COLUMN],
  needsAttention: STANDARD_COLUMNS,
}

const EMPTY_RESPONSE: BillingResponse = {
  itemsReceived: 0,
  curPage: 1,
  nextPage: null,
  prevPage: null,
  offset: 0,
  perPage: 25,
  itemsTotal: 0,
  pageTotal: 1,
  items: [],
}

export function BillingPanel() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusView, setStatusView] = useState<LocationStatusView>('active')
  const [sortField, setSortField] = useState<BillingSortField>('lastUpdated')
  const [sortDirection, setSortDirection] = useState<BillingSortDirection>('desc')
  const [response, setResponse] = useState<BillingResponse>(EMPTY_RESPONSE)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPausing, setIsPausing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [filterRows, setFilterRows] = useState<FilterRow[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const activeStatusView = STATUS_VIEWS.find((view) => view.key === statusView) ?? STATUS_VIEWS[0]
  const activeColumns = COLUMNS_BY_STATUS[statusView]

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1)
      setSearchTerm(searchInput.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()

    async function loadBilling() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchBillingLocations(
          {
            page,
            perPage,
            search: searchTerm || undefined,
            warningOnly: activeStatusView.warningOnly,
            sort: { [sortField]: sortDirection },
            filterExpression: buildFilterExpression([...activeStatusView.filters, ...filterRows]) ?? undefined,
          },
          controller.signal,
        )

        setResponse(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        setError(err instanceof Error ? err.message : 'Unable to load locations.')
        setResponse(EMPTY_RESPONSE)
      } finally {
        setIsLoading(false)
      }
    }

    void loadBilling()

    return () => controller.abort()
  }, [activeStatusView, filterRows, page, perPage, refreshNonce, searchTerm, sortDirection, sortField])

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => response.items.some((item) => item.id === id)))
  }, [response.items])

  function handleSort(column: BillingSortField) {
    setPage(1)

    if (column === sortField) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(column)
    setSortDirection(column === 'lastUpdated' ? 'desc' : 'asc')
  }

  function handleRefresh() {
    setActionMessage(null)
    setRefreshNonce((current) => current + 1)
  }

  function handleStatusViewChange(nextView: LocationStatusView) {
    setPage(1)
    setSelectedIds([])
    setActionMessage(null)
    setStatusView(nextView)
  }

  function handleToggleRow(id: string) {
    setActionMessage(null)
    setSelectedIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]))
  }

  function handleToggleAllRows() {
    setActionMessage(null)

    if (allVisibleSelected) {
      setSelectedIds([])
      return
    }

    setSelectedIds(visibleRowIds)
  }

  async function handlePauseSelected() {
    if (selectedIds.length === 0) {
      return
    }

    setIsPausing(true)
    setError(null)
    setActionMessage(null)

    try {
      await pauseBillingLocations(selectedIds)
      setActionMessage(`Paused ${selectedIds.length} location${selectedIds.length === 1 ? '' : 's'}.`)
      setSelectedIds([])
      setRefreshNonce((current) => current + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to pause selected locations.')
    } finally {
      setIsPausing(false)
    }
  }

  const showingFrom = response.itemsTotal === 0 ? 0 : (response.curPage - 1) * response.perPage + 1
  const showingTo = response.itemsTotal === 0 ? 0 : showingFrom + response.items.length - 1
  const visiblePages = getVisiblePages(response.curPage, response.pageTotal)
  const visibleRowIds = response.items.map((item) => item.id)
  const allVisibleSelected = visibleRowIds.length > 0 && visibleRowIds.every((id) => selectedIds.includes(id))
  const selectedCount = selectedIds.length
  const filterCount = filterRows.filter((r) => r.field && r.value.trim()).length

  return (
    <section className="panel billing-panel panel-elevated">
      <div className="billing-header-row">
        <div>
          <div className="billing-title-row">
            <h2>Locations</h2>
            <span className="pill">{response.itemsTotal} total</span>
            <span className="pill pill-warn">{activeStatusView.label}</span>
          </div>
          <p className="subtext">Live location ledger with server-side search, paging, sorting, and status filtering.</p>
        </div>

        <div className="billing-controls">
          <div className="location-status-tabs" role="tablist" aria-label="Location status">
            {STATUS_VIEWS.map((view) => (
              <button
                key={view.key}
                type="button"
                role="tab"
                aria-selected={view.key === statusView}
                className={`location-status-tab ${view.key === statusView ? 'active' : ''}`}
                onClick={() => handleStatusViewChange(view.key)}
              >
                {view.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="billing-input"
            placeholder="Search by name or location ID"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />

          <select
            className="billing-select"
            value={perPage}
            onChange={(event) => {
              setPage(1)
              setPerPage(Number(event.target.value))
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} / page
              </option>
            ))}
          </select>

          <button
            className={`filter-button ${filterCount > 0 ? 'filter-button-active' : ''}`}
            onClick={() => setIsFilterOpen(true)}
          >
            Filter
            {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
          </button>

          <button className="refresh-button" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="bulk-actions-panel">
          <div className="bulk-actions-copy">
            <span className="pill pill-dark">{selectedCount} selected</span>
            <span>Bulk actions apply to the selected location rows.</span>
          </div>

          <div className="bulk-actions-controls">
            <button className="bulk-action-button bulk-action-button-pause" disabled={isPausing} onClick={() => void handlePauseSelected()}>
              {isPausing ? 'Pausing...' : 'Pause'}
            </button>
            <button className="bulk-action-button" disabled={isPausing} onClick={() => setSelectedIds([])}>
              Clear selection
            </button>
          </div>
        </div>
      )}

      {actionMessage && <div className="action-notice">{actionMessage}</div>}

      <div className="billing-summary-row">
        <span>
          Showing {showingFrom}-{showingTo} of {response.itemsTotal} {activeStatusView.summaryLabel}
        </span>
        <span>
          Page {response.curPage} of {response.pageTotal}
        </span>
      </div>

      {error && <section className="panel error">{error}</section>}

      <div className="table-wrap billing-table-wrap">
        <table className="billing-table">
          <thead>
            <tr>
              <th className="checkbox-column">
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={isLoading || response.items.length === 0 || isPausing}
                    onChange={handleToggleAllRows}
                    aria-label="Select all visible rows"
                  />
                </label>
              </th>
              {activeColumns.map((column) => (
                <th key={column.key}>
                  <button className="sort-button" onClick={() => handleSort(column.sortKey ?? 'lastUpdated')}>
                    <span>{column.label}</span>
                    <span className="sort-indicator">
                      {sortField === column.sortKey ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={activeColumns.length + 1}>Loading locations...</td>
              </tr>
            )}

            {!isLoading && response.items.length === 0 && (
              <tr>
                <td colSpan={activeColumns.length + 1}>No locations matched the current filters.</td>
              </tr>
            )}

            {!isLoading && response.items.map((item) => (
              <BillingRow
                key={item.id}
                item={item}
                columns={activeColumns}
                checked={selectedIds.includes(item.id)}
                disabled={isPausing}
                onToggle={handleToggleRow}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="billing-footer-row">
        <p className="footer-note">
          {activeStatusView.footerLabel}.{' '}
          {searchTerm ? `Filtered by "${searchTerm}". ` : ''}
          Sorted by {getColumnLabel(sortField)} ({sortDirection}) via API.
        </p>

        <div className="pagination-controls">
          <button className="pagination-button" disabled={!response.prevPage || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>

          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              className={`page-chip ${pageNumber === response.curPage ? 'active' : ''}`}
              disabled={isLoading}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}

          <button className="pagination-button" disabled={!response.nextPage || isLoading} onClick={() => setPage((current) => Math.min(response.pageTotal, current + 1))}>
            Next
          </button>
        </div>
      </div>
      <FilterBuilderModal
        isOpen={isFilterOpen}
        appliedRows={filterRows}
        fields={FILTERABLE_FIELDS}
        onClose={() => setIsFilterOpen(false)}
        onApply={(rows) => {
          setFilterRows(rows)
          setPage(1)
        }}
      />
    </section>
  )
}

function BillingRow({
  item,
  columns,
  checked,
  disabled,
  onToggle,
}: {
  item: BillingLocation
  columns: LocationColumn[]
  checked: boolean
  disabled: boolean
  onToggle: (id: string) => void
}) {
  return (
    <tr className={checked ? 'selected-row' : ''}>
      <td className="checkbox-column">
        <label className="checkbox-wrap">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => onToggle(item.id)}
            aria-label={`Select ${item.name || 'location'}`}
          />
        </label>
      </td>
      {columns.map((column) => (
        <td key={column.key}>{column.render(item)}</td>
      ))}
    </tr>
  )
}

function MergedCell({
  primary,
  secondary,
  secondaryMono = false,
}: {
  primary: ReactNode
  secondary: ReactNode
  secondaryMono?: boolean
}) {
  return (
    <div className="merged-cell">
      <strong>{primary}</strong>
      <span className={secondaryMono ? 'merged-cell-secondary mono-cell' : 'merged-cell-secondary'}>{secondary}</span>
    </div>
  )
}

function getVisiblePages(currentPage: number, pageTotal: number) {
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(pageTotal, currentPage + 2)
  const pages: number[] = []

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  return pages
}

function getColumnLabel(column: BillingSortField) {
  const sortLabels: Record<BillingSortField, string> = {
    name: 'Location',
    location_id: 'Location ID',
    email: 'Email',
    account_type: 'Account Type',
    stripe_customerId: 'Stripe Customer ID',
    subscription_plan: 'Plan',
    subscription_status: 'Subscription',
    saas_mode: 'SaaS Mode',
    isPaused: 'Paused',
    agency_name: 'Agency',
    lastUpdated: 'Last Updated',
  }

  return sortLabels[column] ?? column
}

function getStatusTone(value: string | null) {
  if (value === 'active') {
    return 'active'
  }

  if (value === 'canceled' || value === 'paused') {
    return 'needs-review'
  }

  return 'pending'
}
