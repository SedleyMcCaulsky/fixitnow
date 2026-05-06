'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VendorProfile {
  id: string
  user_id: string
  trade_type: string
  specialties: string[]
  rate_per_day: number
  rating: number
  total_jobs: number
  status: string
  profiles: {
    full_name: string
    email: string
  }
}

export default function VendorApprovalsPage() {
  const [vendors, setVendors] = useState<VendorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/vendors')
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to load vendor approvals.')
      } else {
        setVendors(payload.vendors || [])
      }
    } catch (err) {
      setError('Network error while loading vendors.')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (vendorId: string) => {
    setError('')
    setApproving(vendorId)
    try {
      const response = await fetch(`/api/vendors/${vendorId}/approve`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error || 'Unable to approve vendor.')
      } else {
        setVendors(vendors.filter((vendor) => vendor.id !== vendorId))
      }
    } catch (err) {
      setError('Network error while approving vendor.')
    } finally {
      setApproving(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor approvals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">Review and approve vendor applications before they can be assigned to projects.</p>
          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {loading ? (
            <div className="text-center py-8">Loading pending vendor applications...</div>
          ) : vendors.length === 0 ? (
            <p className="text-slate-600">No pending vendor applications found.</p>
          ) : (
            <div className="space-y-4">
              {vendors.map((vendor) => (
                <Card key={vendor.id}>
                  <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="text-sm text-slate-500">{vendor.profiles.full_name} ({vendor.profiles.email})</p>
                      <p className="text-lg font-semibold">{vendor.trade_type}</p>
                      <p className="text-sm text-slate-600">Specialties: {vendor.specialties.join(', ') || 'None'}</p>
                      <p className="text-sm text-slate-600">Rate: JMD {vendor.rate_per_day}</p>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={() => handleApprove(vendor.id)}
                        disabled={approving === vendor.id}
                      >
                        {approving === vendor.id ? 'Approving...' : 'Approve'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
