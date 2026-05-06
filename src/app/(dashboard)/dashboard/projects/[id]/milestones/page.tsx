'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Milestone {
  id: string
  title: string
  description: string
  milestone_order: number
  status: string
  budget_allocation: number | null
  scheduled_start_date: string | null
  scheduled_end_date: string | null
  submitted_at: string | null
  approved_at: string | null
  payment_intent_id?: string | null
  payment_status?: string | null
}

export default function MilestonesPage({ params }: { params: { id: string } }) {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [order, setOrder] = useState('1')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeDisputeId, setActiveDisputeId] = useState<string | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsError, setNotificationsError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  const milestoneStatusCounts = milestones.reduce<Record<string, number>>((acc, milestone) => {
    acc[milestone.status] = (acc[milestone.status] || 0) + 1
    return acc
  }, {})

  const paymentStatusCounts = milestones.reduce<Record<string, number>>((acc, milestone) => {
    const status = milestone.payment_status || 'NOT_STARTED'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800'
      case 'SUBMITTED':
        return 'bg-sky-100 text-sky-800'
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800'
      case 'DISPUTED':
        return 'bg-rose-100 text-rose-800'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  useEffect(() => {
    fetchMilestones()
    fetchNotifications()
  }, [params.id])

  const fetchMilestones = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${params.id}/milestones`)
      const payload = await response.json()
      setMilestones(payload.milestones || [])
    } catch (err) {
      console.error('Error fetching milestones:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    setNotificationsLoading(true)
    setNotificationsError('')
    try {
      const response = await fetch(`/api/projects/${params.id}/milestones/notifications`)
      const payload = await response.json()
      if (!response.ok) {
        setNotificationsError(payload.error || 'Unable to load milestone notifications.')
      } else {
        setNotifications(payload.notifications || [])
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setNotificationsError('Network error while loading milestone notifications.')
    } finally {
      setNotificationsLoading(false)
    }
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setStatusMessage('')
    if (!title || !order) {
      setError('Title and milestone order are required.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${params.id}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          milestone_order: Number(order),
          budget_allocation: budget ? Number(budget) : null,
          scheduled_start_date: startDate || null,
          scheduled_end_date: endDate || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Failed to create milestone.')
      } else {
        setMilestones([...milestones, payload])
        setTitle('')
        setDescription('')
        setOrder('1')
        setBudget('')
        setStartDate('')
        setEndDate('')
        setStatusMessage('Milestone created successfully.')
        await fetchNotifications()
      }
    } catch (err) {
      setError('Network error while creating milestone.')
    } finally {
      setSubmitting(false)
    }
  }

  const refreshMilestones = async () => {
    setError('')
    await fetchMilestones()
  }

  const handleSubmitMilestone = async (milestoneId: string) => {
    setError('')
    setStatusMessage('')
    setActionLoading(milestoneId)
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/submit`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to submit milestone.')
      } else {
        setStatusMessage('Milestone submitted for approval.')
        await refreshMilestones()
        await fetchNotifications()
      }
    } catch (err) {
      setError('Network error while submitting milestone.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleApproveMilestone = async (milestoneId: string) => {
    setError('')
    setStatusMessage('')
    setActionLoading(milestoneId)
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/approve`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to approve milestone.')
      } else {
        setStatusMessage('Milestone approved successfully. Escrow payment intent created.')
        await refreshMilestones()
        await fetchNotifications()
      }
    } catch (err) {
      setError('Network error while approving milestone.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReleasePayment = async (milestoneId: string) => {
    setError('')
    setStatusMessage('')
    setActionLoading(milestoneId)
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/capture`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to release payment.')
      } else {
        setStatusMessage('Payment released successfully.')
        await refreshMilestones()
        await fetchNotifications()
      }
    } catch (err) {
      setError('Network error while releasing payment.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDisputeMilestone = async (milestoneId: string) => {
    if (!disputeReason.trim()) {
      setError('Please enter a dispute reason.')
      return
    }

    setError('')
    setStatusMessage('')
    setActionLoading(milestoneId)
    try {
      const response = await fetch(`/api/milestones/${milestoneId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to dispute milestone.')
      } else {
        setActiveDisputeId(null)
        setDisputeReason('')
        setStatusMessage('Milestone dispute submitted.')
        await refreshMilestones()
        await fetchNotifications()
      }
    } catch (err) {
      setError('Network error while disputing milestone.')
    } finally {
      setActionLoading(null)
    }
  }

  const openDispute = (milestoneId: string) => {
    setActiveDisputeId(milestoneId)
    setDisputeReason('')
    setError('')
  }

  const closeDispute = () => {
    setActiveDisputeId(null)
    setDisputeReason('')
    setError('')
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Milestones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Add milestone steps for this project. Customers can create milestones and view submission status here.</p>
            {statusMessage && <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">{statusMessage}</div>}
            {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <form onSubmit={handleCreate} className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Order</label>
                  <Input type="number" min={1} value={order} onChange={(event) => setOrder(event.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Budget allocation</label>
                  <Input type="number" min={0} value={budget} onChange={(event) => setBudget(event.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Start date</label>
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">End date</label>
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Creating milestone...' : 'Create milestone'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Milestone overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Total milestones</p>
              <p className="mt-3 text-3xl font-semibold text-slate-900">{milestones.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Milestone status</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {Object.entries(milestoneStatusCounts).map(([status, count]) => (
                  <p key={status}>
                    <span className="font-semibold">{count}</span> {status.toLowerCase()}
                  </p>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Payment status</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {Object.entries(paymentStatusCounts).map(([status, count]) => (
                  <p key={status}>
                    <span className="font-semibold">{count}</span> {status.replace(/_/g, ' ').toLowerCase()}
                  </p>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-sm text-slate-600">Milestone notifications are generated from audit events and approval workflow updates.</p>
            <Button onClick={fetchNotifications} disabled={notificationsLoading}>
              {notificationsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <p className="text-sm text-slate-600">Milestone-specific notifications generated from recent milestone audit events.</p>
            <Button onClick={fetchNotifications} disabled={notificationsLoading}>
              {notificationsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
          {notificationsError ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{notificationsError}</div>
          ) : notificationsLoading ? (
            <div className="text-center py-6">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <p className="text-slate-600">No milestone notifications yet.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{notification.event_type.replace(/_/g, ' ').toLowerCase()}</p>
                      <p className="text-sm text-slate-600">{notification.profiles?.full_name || 'Unknown user'}</p>
                    </div>
                    <p className="text-sm text-slate-500">{new Date(notification.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-slate-700 mt-2">{notification.action}</p>
                  {notification.changes ? (
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-white p-3 text-xs text-slate-700">{JSON.stringify(notification.changes, null, 2)}</pre>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
            <CardTitle>Existing milestones</CardTitle>
            <Button onClick={refreshMilestones} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh milestones'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading milestones...</div>
          ) : milestones.length === 0 ? (
            <p className="text-slate-600">No milestones yet. Create the first one above.</p>
          ) : (
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                      <p className="text-sm text-slate-500">Milestone {milestone.milestone_order}</p>
                      <p className="text-lg font-semibold">{milestone.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{milestone.description}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Budget</p>
                          <p className="text-sm text-slate-700">{milestone.budget_allocation ? `$${milestone.budget_allocation}` : 'Not assigned'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Schedule</p>
                          <p className="text-sm text-slate-700">{milestone.scheduled_start_date || 'TBD'} — {milestone.scheduled_end_date || 'TBD'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
                          <p className="text-sm text-slate-700">{milestone.submitted_at ? new Date(milestone.submitted_at).toLocaleString() : 'Not submitted'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
                          <p className="text-sm text-slate-700">{milestone.approved_at ? new Date(milestone.approved_at).toLocaleString() : 'Not approved'}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Escrow</p>
                          <p className="text-sm text-slate-700">{milestone.payment_status || 'Not started'}</p>
                          {milestone.payment_intent_id ? (
                            <p className="text-xs text-slate-500 mt-1">Intent {milestone.payment_intent_id}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <div className={`rounded-full px-4 py-2 text-sm font-semibold ${getStatusClasses(milestone.status)}`}>
                        {milestone.status}
                      </div>
                      {milestone.payment_status ? (
                        <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                          Payment: {milestone.payment_status.replace(/_/g, ' ')}
                        </div>
                      ) : null}
                      {milestone.status === 'PENDING' ? (
                        <Button
                          onClick={() => handleSubmitMilestone(milestone.id)}
                          disabled={actionLoading === milestone.id}
                        >
                          {actionLoading === milestone.id ? 'Submitting...' : 'Submit for approval'}
                        </Button>
                      ) : milestone.status === 'SUBMITTED' ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Button
                            onClick={() => handleApproveMilestone(milestone.id)}
                            disabled={actionLoading === milestone.id}
                          >
                            {actionLoading === milestone.id ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openDispute(milestone.id)}
                            disabled={actionLoading === milestone.id}
                          >
                            Dispute
                          </Button>
                        </div>
                      ) : milestone.status === 'APPROVED' && milestone.payment_status !== 'CAPTURED' ? (
                        <Button
                          onClick={() => handleReleasePayment(milestone.id)}
                          disabled={actionLoading === milestone.id}
                        >
                          {actionLoading === milestone.id ? 'Releasing...' : 'Release payment'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {activeDisputeId === milestone.id ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-sm font-semibold text-rose-700">Dispute milestone</p>
                      <Textarea
                        value={disputeReason}
                        onChange={(event) => setDisputeReason(event.target.value)}
                        placeholder="Describe why this milestone needs to be disputed"
                      />
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button
                          variant="outline"
                          onClick={closeDispute}
                          disabled={actionLoading === milestone.id}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => handleDisputeMilestone(milestone.id)}
                          disabled={actionLoading === milestone.id}
                        >
                          {actionLoading === milestone.id ? 'Disputing...' : 'Submit dispute'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
