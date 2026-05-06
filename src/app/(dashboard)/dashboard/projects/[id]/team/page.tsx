'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

interface VendorSuggestion {
  id: string
  trade_type: string
  rate_per_day: number
  specialties: string[]
  rating: number
  total_jobs: number
  profiles: {
    full_name: string
    avatar_url: string | null
  }
}

export default function TeamPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [vendors, setVendors] = useState<VendorSuggestion[]>([])
  const [selectedVendor, setSelectedVendor] = useState('')
  const [role, setRole] = useState('General Contractor')
  const [days, setDays] = useState('1')
  const [rate, setRate] = useState('0')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchTeam()
  }, [params.id])

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/team`)
      const payload = await response.json()
      setTeam(payload.team || [])
    } catch (err) {
      console.error('Error fetching team:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchVendors = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/team/recommend`)
      const payload = await response.json()
      setVendors(payload.vendors || [])
    } catch (err) {
      console.error('Error fetching vendors:', err)
    }
  }

  const handleVendorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setSelectedVendor(value)
    const vendor = vendors.find((vendor) => vendor.id === value)
    if (vendor) {
      setRate(String(vendor.rate_per_day))
    }
  }

  const handleAddMember = async () => {
    setError('')
    if (!selectedVendor || !days || !rate) {
      setError('Please select a vendor and enter days and rate.')
      return
    }

    const response = await fetch(`/api/projects/${params.id}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_id: selectedVendor,
        role,
        allocated_days: Number(days),
        rate_per_day: Number(rate),
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error || 'Unable to add team member')
      return
    }

    setTeam([payload, ...team])
    setSelectedVendor('')
    setDays('1')
    setRate('0')
    setShowForm(false)
  }

  const handleRemove = async (teamId: string) => {
    if (!confirm('Remove this team member?')) return

    const response = await fetch(`/api/projects/${params.id}/team`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_id: teamId }),
    })

    if (!response.ok) {
      const payload = await response.json()
      console.error('Unable to remove member:', payload.error)
      return
    }

    setTeam(team.filter((member) => member.id !== teamId))
  }

  const handleToggleForm = async () => {
    setShowForm(!showForm)
    if (!showForm) {
      await fetchVendors()
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading team...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Team</h1>
        <Button onClick={handleToggleForm}>
          {showForm ? 'Cancel' : 'Add Team Member'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Team Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div>
              <label className="text-sm font-medium">Vendor</label>
              <select
                value={selectedVendor}
                onChange={handleVendorChange}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">Select an approved vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.profiles.full_name} — {vendor.trade_type} — JMD {vendor.rate_per_day}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Role</label>
              <Input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Electrician" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Allocated days</label>
                <Input value={days} type="number" min={1} onChange={(event) => setDays(event.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Rate per day</label>
                <Input value={rate} type="number" min={0} onChange={(event) => setRate(event.target.value)} />
              </div>
            </div>
            {selectedVendor ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-medium text-slate-900">Selected vendor details</p>
                <p>
                  {vendors.find((vendor) => vendor.id === selectedVendor)?.profiles.full_name}{' '}
                  — {vendors.find((vendor) => vendor.id === selectedVendor)?.trade_type}
                </p>
              </div>
            ) : null}

            <Button onClick={handleAddMember}>Add to team</Button>
          </CardContent>
        </Card>
      )}

      {team.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center py-8">No team members yet. Add one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-4">Vendor</th>
                    <th className="text-left py-2 px-4">Role</th>
                    <th className="text-left py-2 px-4">Days</th>
                    <th className="text-left py-2 px-4">Rate/Day</th>
                    <th className="text-left py-2 px-4">Total</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-left py-2 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((member) => (
                    <tr key={member.id} className="border-b">
                      <td className="py-3 px-4">
                      <div className="font-semibold">
                        {member.vendor_profiles?.profiles.full_name || member.vendor_id}
                      </div>
                      <div className="text-sm text-slate-500">
                        {member.vendor_profiles?.trade_type || 'Vendor'}
                      </div>
                    </td>
                    <td className="py-3 px-4">{member.role}</td>
                    <td className="py-3 px-4">{member.allocated_days}</td>
                    <td className="py-3 px-4">${member.rate_per_day}</td>
                    <td className="py-3 px-4 font-semibold">${member.total_cost}</td>
                    <td className="py-3 px-4">{member.status}</td>
                    <td className="py-3 px-4">
                        <Button variant="outline" size="sm" onClick={() => handleRemove(member.id)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
