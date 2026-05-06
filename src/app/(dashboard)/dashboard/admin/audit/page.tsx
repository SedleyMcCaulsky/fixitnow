'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

interface AuditEvent {
  id: string
  user_id: string
  event_type: string
  resource_type: string
  resource_id: string
  action: string
  changes: Record<string, any>
  created_at: string
  profiles: {
    full_name: string | null
    email: string | null
  }
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('')
  const [dateFromFilter, setDateFromFilter] = useState('')
  const [dateToFilter, setDateToFilter] = useState('')

  const eventTypes = [
    'VENDOR_APPROVED',
    'VENDOR_REJECTED',
    'MILESTONE_CREATED',
    'MILESTONE_SUBMITTED',
    'MILESTONE_APPROVED',
    'MILESTONE_DISPUTED',
    'PAYMENT_RELEASED',
    'PROJECT_CREATED',
    'TEAM_MEMBER_ADDED',
    'TEAM_MEMBER_REMOVED',
  ]

  const resourceTypes = [
    'project',
    'milestone',
    'vendor',
    'team',
    'payment',
    'user',
  ]

  useEffect(() => {
    fetchAuditLogs()
  }, [pagination.page, eventTypeFilter, resourceTypeFilter, dateFromFilter, dateToFilter])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
      })

      if (eventTypeFilter) params.append('event_type', eventTypeFilter)
      if (resourceTypeFilter) params.append('resource_type', resourceTypeFilter)
      if (dateFromFilter) params.append('start_date', new Date(dateFromFilter).toISOString())
      if (dateToFilter) params.append('end_date', new Date(dateToFilter).toISOString())

      const response = await fetch(`/api/admin/audit?${params}`)
      const data = await response.json()

      if (response.ok) {
        setEvents(data.events || [])
        setPagination(data.pagination)
      } else {
        console.error('Failed to fetch audit logs:', data.error)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
      })

      if (eventTypeFilter) params.append('event_type', eventTypeFilter)
      if (resourceTypeFilter) params.append('resource_type', resourceTypeFilter)
      if (dateFromFilter) params.append('start_date', new Date(dateFromFilter).toISOString())
      if (dateToFilter) params.append('end_date', new Date(dateToFilter).toISOString())

      const response = await fetch(`/api/admin/audit?${params}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    }
  }

  const handleClearFilters = () => {
    setEventTypeFilter('')
    setResourceTypeFilter('')
    setDateFromFilter('')
    setDateToFilter('')
    setPagination({ ...pagination, page: 1 })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <div className="text-sm text-gray-600">
          Total events: <span className="font-semibold">{pagination.total}</span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Event Type</label>
              <Select
                value={eventTypeFilter}
                onChange={(e) => {
                  setEventTypeFilter(e.target.value)
                  setPagination({ ...pagination, page: 1 })
                }}
              >
                <option value="">All Events</option>
                {eventTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Resource Type</label>
              <Select
                value={resourceTypeFilter}
                onChange={(e) => {
                  setResourceTypeFilter(e.target.value)
                  setPagination({ ...pagination, page: 1 })
                }}
              >
                <option value="">All Resources</option>
                {resourceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Page Size</label>
              <Select
                value={String(pagination.limit)}
                onChange={(e) => {
                  setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 })
                }}
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFromFilter}
                onChange={(e) => {
                  setDateFromFilter(e.target.value)
                  setPagination({ ...pagination, page: 1 })
                }}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateToFilter}
                onChange={(e) => {
                  setDateToFilter(e.target.value)
                  setPagination({ ...pagination, page: 1 })
                }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
            <Button onClick={handleExportCSV} variant="outline">
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">Loading audit logs...</div>
            </div>
          ) : events.length === 0 ? (
            <div className="flex justify-center py-8">
              <div className="text-gray-500">No audit events found</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">User</th>
                      <th className="px-4 py-2 text-left font-semibold">Event</th>
                      <th className="px-4 py-2 text-left font-semibold">Resource</th>
                      <th className="px-4 py-2 text-left font-semibold">Action</th>
                      <th className="px-4 py-2 text-left font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium">{event.profiles?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{event.profiles?.email || event.user_id}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {event.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="text-xs text-gray-600">{event.resource_type}</div>
                            <div className="font-mono text-xs text-gray-500">{event.resource_id}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
                            {event.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                    disabled={pagination.page === 1 || loading}
                    variant="outline"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                      const pageNum = Math.max(1, pagination.page - 2) + i
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => setPagination({ ...pagination, page: pageNum })}
                          variant={pageNum === pagination.page ? 'default' : 'outline'}
                          size="sm"
                          disabled={pageNum > pagination.totalPages}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    onClick={() => setPagination({ ...pagination, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                    disabled={pagination.page === pagination.totalPages || loading}
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
