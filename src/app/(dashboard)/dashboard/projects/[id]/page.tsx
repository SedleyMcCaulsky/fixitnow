'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Project {
  id: string
  title: string
  description: string
  parish: string
  status: string
  budget_ceiling: number
  created_at: string
}

interface TeamMember {
  id: string
  vendor_id: string
  role: string
  allocated_days: number
  rate_per_day: number
  total_cost: number
  status: string
  vendor_profiles?: {
    id: string
    trade_type: string
    rate_per_day: number
    profiles: {
      full_name: string
      email: string
    }
  }
}

interface Milestone {
  id: string
  title: string
  description: string
  milestone_order: number
  status: string
  budget_allocation: number | null
  submitted_at: string | null
  approved_at: string | null
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) throw error
        setProject(data)
      } catch (err) {
        console.error('Error fetching project:', err)
      }
    }

    const fetchTeam = async () => {
      try {
        const response = await fetch(`/api/projects/${params.id}/team`)
        const payload = await response.json()
        setTeam(payload.team || [])
      } catch (err) {
        console.error('Error fetching team:', err)
      }
    }

    const fetchMilestones = async () => {
      try {
        const response = await fetch(`/api/projects/${params.id}/milestones`)
        const payload = await response.json()
        setMilestones(payload.milestones || [])
      } catch (err) {
        console.error('Error fetching milestones:', err)
      }
    }

    const load = async () => {
      setLoading(true)
      await Promise.all([fetchProject(), fetchTeam(), fetchMilestones()])
      setLoading(false)
    }

    load()
  }, [params.id, supabase])

  if (loading) {
    return <div className="text-center py-12">Loading project...</div>
  }

  if (!project) {
    return <div className="text-center py-12">Project not found</div>
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-3xl">{project.title}</CardTitle>
              <p className="text-gray-600 mt-2">{project.description}</p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
              {project.status}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-600">Parish</p>
              <p className="text-lg font-semibold">{project.parish}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Budget Ceiling</p>
              <p className="text-lg font-semibold">${project.budget_ceiling || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-lg font-semibold">{new Date(project.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Team</h2>
          <Link href={`/dashboard/projects/${project.id}/team`}>
            <Button>Manage Team</Button>
          </Link>
        </div>
        <Card>
          <CardContent>
            {team.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No team members assigned yet.</p>
            ) : (
              <div className="grid gap-4">
                {team.map((member) => (
                  <div key={member.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-gray-600">Vendor</p>
                        <p className="text-lg font-semibold">{member.vendor_profiles?.profiles.full_name || member.vendor_id}</p>
                        <p className="text-sm text-slate-600">{member.vendor_profiles?.trade_type || 'Vendor'}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-gray-600">Role</p>
                          <p className="text-lg font-semibold">{member.role}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Days</p>
                          <p className="text-lg font-semibold">{member.allocated_days}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Rate/Day</p>
                          <p className="text-lg font-semibold">${member.rate_per_day}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total cost</p>
                          <p className="text-lg font-semibold">${member.total_cost}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Milestones</h2>
          <Link href={`/dashboard/projects/${project.id}/milestones`}>
            <Button>Manage Milestones</Button>
          </Link>
        </div>
        <Card>
          <CardContent>
            {milestones.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No milestones created yet.</p>
            ) : (
              <div className="space-y-4">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{`Milestone ${milestone.milestone_order}`}</p>
                        <p className="text-lg font-semibold">{milestone.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{milestone.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="text-lg font-semibold">{milestone.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
