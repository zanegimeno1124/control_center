import { useEffect, useState } from 'react'
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

const COLUMNS: Array<{ key: BillingSortField; label: string }> = [
  { key: 'name', label: 'Location' },
  { key: 'location_id', label: 'Location ID' },
  { key: 'email', label: 'Email' },
  { key: 'account_type', label: 'Account Type' },
  { key: 'stripe_customerId', label: 'Stripe Customer ID' },
  { key: 'subscription_plan', label: 'Plan' },
  { key: 'subscription_status', label: 'Subscription' },
  { key: 'saas_mode', label: 'SaaS Mode' },
  { key: 'isPaused', label: 'Paused' },
  { key: 'agency_name', label: 'Agency' },
  { key: 'lastUpdated', label: 'Last Updated' },
]

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
  const [warningOnly, setWarningOnly] = useState(false)
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
            warningOnly,
            sort: { [sortField]: sortDirection },
            filterExpression: buildFilterExpression(filterRows) ?? undefined,
          },
          controller.signal,
        )

        setResponse(data)
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        setError(err instanceof Error ? err.message : 'Unable to load billing data.')
        setResponse(EMPTY_RESPONSE)
      } finally {
        setIsLoading(false)
      }
    }

    void loadBilling()

    return () => controller.abort()
  }, [filterRows, page, perPage, refreshNonce, searchTerm, sortDirection, sortField, warningOnly])

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

  function handleToggleWarning() {
    setPage(1)
    setActionMessage(null)
    setWarningOnly((current) => !current)
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
            <h2>Billing Locations</h2>
            <span className="pill">{response.itemsTotal} total</span>
            {warningOnly && <span className="pill pill-warn">Needs attention</span>}
          </div>
          <p className="subtext">Live billing ledger with server-side search, paging, sorting, and warning-mode filtering.</p>
        </div>

        <div className="billing-controls">
          <label className="toggle-card">
            <button
              type="button"
              role="switch"
              aria-checked={warningOnly}
              className={`toggle-switch ${warningOnly ? 'on' : ''}`}
              onClick={handleToggleWarning}
            >
              <span className="toggle-thumb" />
            </button>
            <span>Needs Attention</span>
          </label>

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
            <span>Bulk actions apply to the selected billing rows.</span>
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
          Showing {showingFrom}-{showingTo} of {response.itemsTotal} {warningOnly ? 'attention items' : 'billing locations'}
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
              {COLUMNS.map((column) => (
                <th key={column.key}>
                  <button className="sort-button" onClick={() => handleSort(column.key)}>
                    <span>{column.label}</span>
                    <span className="sort-indicator">
                      {sortField === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={COLUMNS.length + 1}>Loading billing locations...</td>
              </tr>
            )}

            {!isLoading && response.items.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1}>No records matched the current filters.</td>
              </tr>
            )}

            {!isLoading && response.items.map((item) => (
              <BillingRow
                key={item.id}
                item={item}
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
          {warningOnly ? 'Needs Attention mode. ' : 'All billing locations. '}
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
  checked,
  disabled,
  onToggle,
}: {
  item: BillingLocation
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
      <td>
        <div className="location-cell">
          <strong>{item.name || 'Unnamed location'}</strong>
        </div>
      </td>
      <td className="mono-cell">{item.location_id || 'N/A'}</td>
      <td>{item.email || 'N/A'}</td>
      <td>{item.account_type || 'N/A'}</td>
      <td className="mono-cell">{item.stripe_customerId || 'N/A'}</td>
      <td>{item.subscription_plan || 'Unassigned'}</td>
      <td>
        <span className={`status ${getStatusTone(item.subscription_status)}`}>{item.subscription_status || 'None'}</span>
      </td>
      <td>
        <span className={`status ${item.saas_mode === 'activated' ? 'active' : 'pending'}`}>{item.saas_mode || 'None'}</span>
      </td>
      <td>
        <div className="pause-cell">
          <span className={`status ${item.isPaused ? 'needs-review' : 'active'}`}>{item.isPaused ? 'Paused' : 'Active'}</span>
          {item.pause_message && <small>{item.pause_message}</small>}
        </div>
      </td>
      <td>{item.agency_name || 'N/A'}</td>
      <td>{formatTimestamp(item.lastUpdated)}</td>
    </tr>
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
  return COLUMNS.find((entry) => entry.key === column)?.label ?? column
}

function formatTimestamp(value: number) {
  if (!value) {
    return 'N/A'
  }

  const date = new Date(Number(value))

  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
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