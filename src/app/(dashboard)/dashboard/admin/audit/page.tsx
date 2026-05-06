'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface AuditEvent {
  id: string
  user_id: string
  event_type: string
  resource_type: string | null
  resource_id: string | null
  action: string
  changes: Record<string, any> | null
  created_at: string
  profiles?: {
    full_name: string
    email: string
  }
}

export default function AuditLogsPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterResource, setFilterResource] = useState('')

  useEffect(() => {
    fetchAuditEvents()
  }, [])

  const fetchAuditEvents = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/audit')
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to load audit events.')
      } else {
        setEvents(payload.events || [])
      }
    } catch (err) {
      setError('Network error while loading audit events.')
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = events.filter((event) => {
    if (filterType && event.event_type !== filterType) {
      return false
    }

    if (filterResource) {
      const eventResource = event.resource_type ?? 'Global'
      if (eventResource !== filterResource) {
        return false
      }
    }

    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return true
    }

    return [
      event.event_type,
      event.resource_type ?? 'Global',
      event.resource_id,
      event.action,
      event.profiles?.full_name,
      event.profiles?.email,
    ].some((value) => value?.toString().toLowerCase().includes(query))
  })

  const eventTypes = [...new Set(events.map((event) => event.event_type))]
  const resourceTypes = [...new Set(events.map((event) => event.resource_type ?? 'Global'))]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit log viewer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Review immutable platform audit events, including approvals, milestone actions, and admin operations.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by user, event, resource or action"
                />
                <select
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                >
                  <option value="">All event types</option>
                  {eventTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <select
                  value={filterResource}
                  onChange={(event) => setFilterResource(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                >
                  <option value="">All resources</option>
                  {resourceTypes.map((resource) => (
                    <option key={resource} value={resource}>{resource}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={fetchAuditEvents} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {error ? (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : loading ? (
            <div className="text-center py-8">Loading audit events...</div>
          ) : events.length === 0 ? (
            <p className="text-slate-600">No audit events available.</p>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-4">
                Showing {filteredEvents.length} of {events.length} events.
              </p>
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{new Date(event.created_at).toLocaleString()}</p>
                        <p className="text-lg font-semibold text-slate-900">{event.event_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">User: {event.profiles?.full_name ?? 'Unknown'}</p>
                        <p className="text-sm text-slate-600">{event.profiles?.email ?? event.user_id}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Resource</p>
                        <p className="text-sm text-slate-700">{event.resource_type || 'Global'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Resource ID</p>
                        <p className="text-sm text-slate-700">{event.resource_id || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Action</p>
                        <p className="text-sm text-slate-700">{event.action}</p>
                      </div>
                    </div>

                    {event.changes ? (
                      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="font-medium text-slate-800 mb-2">Details</p>
                        <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(event.changes, null, 2)}</pre>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
