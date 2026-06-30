import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { BillingPanel } from './BillingPanel'
import { IntegrationsPanel } from './IntegrationsPanel'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function PolicyHub() {
  const { data, isLoading, error } = useAppData()
  const [activeView, setActiveView] = useState<'overview' | 'billing' | 'integrations'>('billing')

  return (
    <main className="app-shell">
      <header className="hero-block">
        <div className="hero-copy">
          <p className="eyebrow">VIPA SWCRM</p>
          <h1>Control Center</h1>
          <p className="subtext hero-text">
            A sharper internal command surface for policy visibility, location oversight, and day-to-day
            operations.
          </p>

          <div className="hero-tags">
            <span className="hero-tag">Internal ops</span>
            <span className="hero-tag">Live location data</span>
            <span className="hero-tag">Desktop-ready workflow</span>
          </div>
        </div>
      </header>

      <section className="view-switcher" aria-label="Control Center Views">
        <button
          className={`view-chip view-chip-disabled`}
          disabled
        >
          Overview
        </button>
        <button
          className={`view-chip ${activeView === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveView('billing')}
        >
          Locations
        </button>
        <button
          className={`view-chip ${activeView === 'integrations' ? 'active' : ''}`}
          onClick={() => setActiveView('integrations')}
        >
          Integrations
        </button>
      </section>

      {activeView === 'overview' && isLoading && <section className="panel">Loading dashboard data...</section>}
      {activeView === 'overview' && error && <section className="panel error">{error}</section>}

      {activeView === 'overview' && data && (
        <>
          <section className="section-heading-row">
            <div>
              <p className="section-kicker">Overview</p>
              <h2 className="section-title">Portfolio snapshot</h2>
            </div>
            <p className="section-note">Monitor policy performance, premium flow, and pending actions at a glance.</p>
          </section>

          <section className="stats-grid">
            <article className="stat-card stat-card-gold">
              <h2>Active Policies</h2>
              <p>{data.stats.activePolicies}</p>
              <span className="stat-meta">Core retained accounts</span>
            </article>
            <article className="stat-card stat-card-dark">
              <h2>Monthly Revenue</h2>
              <p>{formatCurrency(data.stats.monthlyRevenue)}</p>
              <span className="stat-meta">Recurring premium projection</span>
            </article>
            <article className="stat-card">
              <h2>Pending Approvals</h2>
              <p>{data.stats.pendingApprovals}</p>
              <span className="stat-meta">Awaiting internal follow-up</span>
            </article>
            <article className="stat-card">
              <h2>Renewals This Month</h2>
              <p>{data.stats.renewalsThisMonth}</p>
              <span className="stat-meta">Near-term retention opportunities</span>
            </article>
          </section>

          <section className="content-grid">
            <article className="panel panel-elevated">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Book activity</p>
                  <h2>Policies</h2>
                </div>
                <span className="pill">{data.policies.length} records</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Policy</th>
                      <th>Premium</th>
                      <th>Status</th>
                      <th>Renewal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.policies.map((policy) => (
                      <tr key={policy.id}>
                        <td>{policy.clientName}</td>
                        <td>{policy.policyType}</td>
                        <td>{formatCurrency(policy.premiumMonthly)}</td>
                        <td>
                          <span className={`status ${policy.status.toLowerCase().replace(' ', '-')}`}>
                            {policy.status}
                          </span>
                        </td>
                        <td>{policy.renewalDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="panel panel-dark">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">Operations feed</p>
                  <h2>Recent Activity</h2>
                </div>
                <span className="pill pill-dark">Live pulse</span>
              </div>
              <ul className="activity-list">
                {data.activities.map((item) => (
                  <li key={item.id}>
                    <span>{item.message}</span>
                    <time>{item.timestamp}</time>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      )}

      {activeView === 'billing' && <BillingPanel />}
      {activeView === 'integrations' && <IntegrationsPanel />}
    </main>
  )
}
