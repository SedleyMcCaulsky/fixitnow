'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReportsMetrics {
  totalProjects: number
  pendingMilestones: number
  disputeMilestones: number
  paidMilestones: number
  approvedVendors: number
  awardRevenue: number
  escrowPending: number
  auditEventsLast30Days: number
  paymentFailures: number
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<ReportsMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reports/summary')
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Unable to load report data.')
      } else {
        setMetrics(payload)
      }
    } catch (err) {
      setError('Network error while loading report data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Reports</CardTitle>
              <p className="text-sm text-slate-600">Platform reconciliation and payment summary for milestones, approvals, and audit activity.</p>
            </div>
            <Button onClick={fetchReports} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : loading || !metrics ? (
            <div className="text-center py-10 text-slate-600">Loading report metrics...</div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Total projects</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.totalProjects}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Approved vendors</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.approvedVendors}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Submitted milestones</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.pendingMilestones}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Open disputes</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.disputeMilestones}</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Released payment revenue</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">${metrics.awardRevenue.toLocaleString()}</p>
                  <p className="text-sm text-slate-600 mt-2">Payments released for paid milestones.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Escrow pending</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">${metrics.escrowPending.toLocaleString()}</p>
                  <p className="text-sm text-slate-600 mt-2">Approved milestones waiting for release.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Payment failures</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.paymentFailures}</p>
                  <p className="text-sm text-slate-600 mt-2">Milestones with failed Stripe capture attempts.</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-500">Audit events (30 days)</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.auditEventsLast30Days}</p>
                  <p className="text-sm text-slate-600 mt-2">Recent immutable audit activity.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
