import { useEffect, useState } from 'react'
import { fetchIntegrations } from '../../services/integrationService'
import type {
  IntegrationLocation,
  IntegrationResponse,
  IntegrationSortDirection,
  IntegrationSortField,
} from '../../shared/types/integration'
import { INTEGRATION_FILTERABLE_FIELDS } from '../../shared/types/integration'
import type { FilterRow } from '../../shared/types/billing'
import { buildFilterExpression } from '../../shared/types/billing'
import { FilterBuilderModal } from './FilterBuilderModal'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const COLUMNS: Array<{ key: IntegrationSortField; label: string }> = [
  { key: 'name', label: 'Location' },
  { key: 'location_id', label: 'Location ID' },
  { key: 'PIT', label: 'PIT' },
  { key: 'pit_status', label: 'PIT Status' },
  { key: 'pit_message', label: 'PIT Message' },
  { key: 'saas_mode', label: 'SaaS Mode' },
  { key: 'subscription_plan', label: 'Plan' },
  { key: 'subscription_status', label: 'Subscription' },
  { key: 'isPaused', label: 'Paused' },
  { key: 'agency_name', label: 'Agency' },
  { key: 'lastUpdated', label: 'Last Updated' },
]

const EMPTY_RESPONSE: IntegrationResponse = {
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

export function IntegrationsPanel() {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<IntegrationSortField>('lastUpdated')
  const [sortDirection, setSortDirection] = useState<IntegrationSortDirection>('desc')
  const [response, setResponse] = useState<IntegrationResponse>(EMPTY_RESPONSE)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

    async function loadIntegrations() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await fetchIntegrations(
          {
            page,
            perPage,
            search: searchTerm || undefined,
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

        setError(err instanceof Error ? err.message : 'Unable to load integration data.')
        setResponse(EMPTY_RESPONSE)
      } finally {
        setIsLoading(false)
      }
    }

    void loadIntegrations()

    return () => controller.abort()
  }, [filterRows, page, perPage, refreshNonce, searchTerm, sortDirection, sortField])

  function handleSort(column: IntegrationSortField) {
    setPage(1)

    if (column === sortField) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(column)
    setSortDirection(column === 'lastUpdated' ? 'desc' : 'asc')
  }

  function handleRefresh() {
    setRefreshNonce((current) => current + 1)
  }

  const showingFrom = response.itemsTotal === 0 ? 0 : (response.curPage - 1) * response.perPage + 1
  const showingTo = response.itemsTotal === 0 ? 0 : showingFrom + response.items.length - 1
  const visiblePages = getVisiblePages(response.curPage, response.pageTotal)
  const filterCount = filterRows.filter((r) => r.field && r.value.trim()).length

  return (
    <section className="panel billing-panel panel-elevated">
      <div className="billing-header-row">
        <div>
          <div className="billing-title-row">
            <h2>Integrations</h2>
            <span className="pill">{response.itemsTotal} total</span>
          </div>
          <p className="subtext">Integration status across all CRM locations — PIT connections, SaaS mode, and subscription state.</p>
        </div>

        <div className="billing-controls">
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

          <button className="refresh-button" onClick={handleRefresh}>
            Refresh
          </button>

          <button
            className={`filter-button ${filterCount > 0 ? 'filter-button-active' : ''}`}
            onClick={() => setIsFilterOpen(true)}
          >
            Filter
            {filterCount > 0 && <span className="filter-badge">{filterCount}</span>}
          </button>
        </div>
      </div>

      <div className="billing-summary-row">
        <span>
          Showing {showingFrom}–{showingTo} of {response.itemsTotal} integrations
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
                <td colSpan={COLUMNS.length}>Loading integrations...</td>
              </tr>
            )}

            {!isLoading && response.items.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length}>No records found.</td>
              </tr>
            )}

            {!isLoading && response.items.map((item) => (
              <IntegrationRow key={item.id} item={item} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="billing-footer-row">
        <p className="footer-note">
          {searchTerm ? `Filtered by "${searchTerm}". ` : ''}
          Sorted by {getColumnLabel(sortField)} ({sortDirection}) via API.
        </p>

        <div className="pagination-controls">
          <button
            className="pagination-button"
            disabled={!response.prevPage || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
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

          <button
            className="pagination-button"
            disabled={!response.nextPage || isLoading}
            onClick={() => setPage((current) => Math.min(response.pageTotal, current + 1))}
          >
            Next
          </button>
        </div>
      </div>
      <FilterBuilderModal
        isOpen={isFilterOpen}
        appliedRows={filterRows}
        fields={INTEGRATION_FILTERABLE_FIELDS}
        onClose={() => setIsFilterOpen(false)}
        onApply={(rows) => {
          setFilterRows(rows)
          setPage(1)
        }}
      />
    </section>
  )
}

function IntegrationRow({ item }: { item: IntegrationLocation }) {
  return (
    <tr>
      <td>
        <div className="location-cell">
          <strong>{item.name || 'Unnamed location'}</strong>
        </div>
      </td>
      <td className="mono-cell">{item.location_id || 'N/A'}</td>
      <td className="mono-cell">{item.PIT || 'N/A'}</td>
      <td>
        <span className={`status ${item.pit_status ? 'active' : 'pending'}`}>
          {item.pit_status ? 'Connected' : 'Not connected'}
        </span>
      </td>
      <td>{item.pit_message || '—'}</td>
      <td>
        <span className={`status ${item.saas_mode === 'activated' ? 'active' : 'pending'}`}>
          {item.saas_mode || 'None'}
        </span>
      </td>
      <td>{item.subscription_plan || 'Unassigned'}</td>
      <td>
        <span className={`status ${getStatusTone(item.subscription_status)}`}>
          {item.subscription_status || 'None'}
        </span>
      </td>
      <td>
        <div className="pause-cell">
          <span className={`status ${item.isPaused ? 'needs-review' : 'active'}`}>
            {item.isPaused ? 'Paused' : 'Active'}
          </span>
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

function getColumnLabel(column: IntegrationSortField) {
  return COLUMNS.find((entry) => entry.key === column)?.label ?? column
}

function formatTimestamp(value: number | null) {
  if (!value) return 'N/A'

  const date = new Date(Number(value))
  if (Number.isNaN(date.getTime())) return 'N/A'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function getStatusTone(status: string | null) {
  if (!status) return 'pending'
  if (status === 'active') return 'active'
  if (status === 'canceled' || status === 'unpaid') return 'needs-review'
  return 'pending'
}
