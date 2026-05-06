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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setProjects(data || [])
      } catch (err) {
        console.error('Error fetching projects:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [supabase])

  const projectStatusCounts = projects.reduce<Record<string, number>>((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return <div className="text-center py-12">Loading projects...</div>
  }

  return (
    <div>
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Projects</h1>
          <p className="text-sm text-slate-600 mt-1">Create work requests, manage teams, and approve milestones from one dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/projects/new">
            <Button>Create New Project</Button>
          </Link>
          <Link href="/dashboard/vendors/apply">
            <Button variant="outline">Vendor Apply</Button>
          </Link>
          <Link href="/dashboard/reports">
            <Button variant="outline">Reports</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 mb-8 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Total projects</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{projects.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Active status breakdown</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            {Object.entries(projectStatusCounts).length === 0 ? (
              <p>No active projects</p>
            ) : (
              Object.entries(projectStatusCounts).map(([status, count]) => (
                <p key={status}>
                  <span className="font-semibold">{count}</span> {status.toLowerCase()}
                </p>
              ))
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Quick actions</p>
          <div className="mt-4 space-y-3">
            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full">View reports</Button>
            </Link>
            <Link href="/dashboard/admin/audit">
              <Button variant="outline" className="w-full">Audit logs</Button>
            </Link>
          </div>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-gray-600 mb-4">No projects yet. Create one to get started!</p>
            <Link href="/dashboard/projects/new">
              <Button>Start Your First Project</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{project.title}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {project.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">Parish</p>
                    <p className="font-medium">{project.parish}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Budget</p>
                    <p className="font-medium">${project.budget_ceiling || 'TBD'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Created</p>
                    <p className="font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <Link href={`/dashboard/projects/${project.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
