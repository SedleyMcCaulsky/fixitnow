'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const TRADE_TYPES = ['Electrician', 'Plumber', 'Carpenter', 'Painter', 'Roofer', 'General Contractor']

export default function VendorApplyPage() {
  const [tradeType, setTradeType] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [rate, setRate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const supabase = createClient()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!tradeType || !rate) {
      setError('Please select your trade and provide a rate.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/vendors/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade_type: tradeType,
          specialties: specialties.split(',').map((item) => item.trim()).filter(Boolean),
          rate_per_day: Number(rate),
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Failed to submit vendor application.')
      } else {
        setSuccess('Vendor application submitted. An admin will review your profile.')
        setTradeType('')
        setSpecialties('')
        setRate('')
      }
    } catch (err) {
      setError('Network error while submitting your application.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Apply as a Vendor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-6">
            Create a contractor profile so customers can add you to project teams. Your application will be reviewed by an admin.
          </p>

          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Trade type</label>
              <select
                value={tradeType}
                onChange={(event) => setTradeType(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2"
                required
              >
                <option value="">Select trade</option>
                {TRADE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Specialties</label>
              <Textarea
                value={specialties}
                onChange={(event) => setSpecialties(event.target.value)}
                placeholder="e.g. kitchen wiring, commercial lighting"
              />
              <p className="text-xs text-slate-500 mt-1">Comma-separated list of your specialties.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Rate per day (JMD)</label>
              <Input
                type="number"
                value={rate}
                min={0}
                onChange={(event) => setRate(event.target.value)}
                placeholder="e.g. 8000"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Submitting...' : 'Submit application'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
