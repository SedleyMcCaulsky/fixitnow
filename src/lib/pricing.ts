export interface TeamMember { trade_type: string; days: number; vendor_id?: string; name?: string }
export interface LineItem { category: string; description: string; unit_rate: number; quantity: number; amount: number }
export interface PricingResult {
  labor_total: number; platform_fee: number; total: number; currency: string
  line_items: LineItem[]; budget_warning: boolean; budget_exceeded: boolean
  alternatives: Array<{ suggestion: string; savings: number }> | null; engine_version: string
}
export async function calculatePricing(parish: string, team: TeamMember[], budget_ceiling?: number): Promise<PricingResult> {
  const res = await fetch('/api/pricing/calculate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parish, team, budget_ceiling }),
  })
  if (!res.ok) throw new Error('Pricing failed')
  return res.json()
}
