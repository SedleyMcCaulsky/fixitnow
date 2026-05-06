'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VendorProfile {
  id: string
  trade_type: string
  specialties: string[]
  rate_per_day: number
  status: string
  rating: number
  total_jobs: number
  profiles: {
    full_name: string
    email: string
  }
}

interface Assignment {
  id: string
  project_id: string
  role: string
  allocated_days: number
  rate_per_day: number
  total_cost: number
  status: string
  created_at: string
  updated_at: string
  projects: {
    id: string
    title: string
    status: string
    parish: string
  }
}

interface Milestone {
  id: string
  project_id: string
  title: string
  status: string
  budget_allocation: number | null
  scheduled_start_date: string | null
  scheduled_end_date: string | null
  submitted_at: string | null
  approved_at: string | null
}

export default function VendorDashboardPage() {
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchVendorAssignments()
  }, [])

  const fetchVendorAssignments = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/vendors/me/assignments')
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to load your vendor dashboard.')
        setVendor(null)
        setAssignments([])
        setMilestones([])
      } else {
        setVendor(payload.vendor ?? null)
        setAssignments(payload.assignments ?? [])
        setMilestones(payload.milestones ?? [])
      }
    } catch (err) {
      setError('Network error while loading your vendor dashboard.')
    } finally {
      setLoading(false)
    }
  }

  const pendingMilestones = milestones.filter((item) => item.status === 'SUBMITTED' || item.status === 'DISPUTED')
  const approvedMilestones = milestones.filter((item) => item.status === 'APPROVED')
  const projectIds = Array.from(new Set(assignments.map((item) => item.project_id)))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor dashboard</h1>
          <p className="text-sm text-slate-600 mt-1">View your assigned projects, upcoming milestones, and work status from one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/vendors/apply">
            <Button variant="outline">Vendor Apply</Button>
          </Link>
          <Button onClick={fetchVendorAssignments} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">Loading your vendor assignments...</div>
      ) : !vendor ? (
        <Card>
          <CardHeader>
            <CardTitle>No vendor profile found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">You do not yet have a contractor profile. Apply now and an admin will review your application.</p>
            <Link href="/dashboard/vendors/apply">
              <Button>Apply as a vendor</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{vendor.profiles.full_name}</p>
                <p className="text-lg font-semibold text-slate-900 mt-2">{vendor.trade_type}</p>
                <p className="text-sm text-slate-600 mt-1">{vendor.specialties.join(', ') || 'No specialties provided'}</p>
                <div className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
                  <p>Profile status: <span className="font-semibold">{vendor.status}</span></p>
                  <p>Rate per day: <span className="font-semibold">JMD {vendor.rate_per_day}</span></p>
                  <p>Rating: <span className="font-semibold">{vendor.rating.toFixed(1)}</span></p>
                  <p>Total jobs: <span className="font-semibold">{vendor.total_jobs}</span></p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Quick summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Projects assigned</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{projectIds.length}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Open milestones</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{pendingMilestones.length}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Approved milestones</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{approvedMilestones.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Next steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>• Review your assigned project work.</li>
                  <li>• Check milestone statuses regularly.</li>
                  <li>• Contact the customer if a milestone is disputed.</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assigned projects</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-slate-600">You currently have no active project assignments.</p>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm text-slate-500">{assignment.projects.parish}</p>
                          <p className="text-xl font-semibold text-slate-900">{assignment.projects.title}</p>
                          <p className="text-sm text-slate-600 mt-1">{assignment.role}</p>
                        </div>
                        <div className="space-y-1 text-right text-sm text-slate-700">
                          <p>Project status: <span className="font-semibold">{assignment.projects.status}</span></p>
                          <p>Assigned days: <span className="font-semibold">{assignment.allocated_days}</span></p>
                          <p>Total cost: <span className="font-semibold">JMD {assignment.total_cost}</span></p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Relevant milestones</CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <p className="text-slate-600">No project milestones yet for your current assignments.</p>
              ) : (
                <div className="space-y-4">
                  {milestones.map((milestone) => (
                    <div key={milestone.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-slate-500">Project ID: {milestone.project_id}</p>
                          <p className="text-lg font-semibold text-slate-900">{milestone.title}</p>
                          <p className="text-sm text-slate-600 mt-1">Status: {milestone.status.toLowerCase()}</p>
                        </div>
                        <div className="space-y-1 text-sm text-slate-700 text-right">
                          <p>Due: {milestone.scheduled_end_date ? new Date(milestone.scheduled_end_date).toLocaleDateString() : 'TBD'}</p>
                          <p>Budget: {milestone.budget_allocation ? `JMD ${milestone.budget_allocation}` : 'Unassigned'}</p>
                          <p>Submitted: {milestone.submitted_at ? new Date(milestone.submitted_at).toLocaleDateString() : 'No'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
