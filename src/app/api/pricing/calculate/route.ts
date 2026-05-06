import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function POST(req: NextRequest) {
  try {
    const { parish, team, budget_ceiling } = await req.json()

    // Verify user is authenticated
    const { user, error: authError } = await requireRole(['CUSTOMER', 'CONTRACTOR'])
    if (authError) return authError

    // Base rates by parish (in JMD per day)
    const parishRates: Record<string, number> = {
      Kingston: 8000,
      'St. Andrew': 7500,
      'St. Thomas': 6000,
      Portland: 5500,
      'St. Mary': 5500,
      'St. Ann': 6000,
      Trelawny: 5500,
      'St. James': 7000,
      Hanover: 5000,
      Westmoreland: 5000,
      'St. Elizabeth': 5000,
      Manchester: 5500,
      Clarendon: 6000,
      'St. Catherine': 7000,
    }

    const baseRate = parishRates[parish] || 6000

    // Calculate line items
    const lineItems = team.map((member: any) => ({
      category: member.trade_type,
      description: `${member.name || member.trade_type} - ${member.days} days`,
      unit_rate: member.rate_per_day || baseRate,
      quantity: member.days,
      amount: (member.rate_per_day || baseRate) * member.days,
    }))

    const laborTotal = lineItems.reduce((sum: number, item: any) => sum + item.amount, 0)
    const platformFee = Math.round(laborTotal * 0.075) // 7.5% platform fee
    const total = laborTotal + platformFee

    const result = {
      labor_total: laborTotal,
      platform_fee: platformFee,
      total,
      currency: 'JMD',
      line_items: lineItems,
      budget_warning: budget_ceiling && total > budget_ceiling * 0.9,
      budget_exceeded: budget_ceiling && total > budget_ceiling,
      alternatives: budget_ceiling && total > budget_ceiling ? [
        {
          suggestion: 'Reduce project scope by 20%',
          savings: Math.round(total * 0.2),
        },
      ] : null,
      engine_version: 'rule-based-v1',
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
