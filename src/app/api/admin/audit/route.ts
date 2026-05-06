import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/rbac'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireRole(['PLATFORM_ADMIN'])
  if (authError) return authError

  const supabase = await createClient()

  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const eventType = searchParams.get('event_type')
  const resourceType = searchParams.get('resource_type')
  const userId = searchParams.get('user_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const format = searchParams.get('format') // 'json' or 'csv'

  // Validate pagination parameters
  const validLimit = Math.min(Math.max(limit, 1), 500) // 1-500 items per page
  const offset = (page - 1) * validLimit

  try {
    // Build base query
    let query = supabase
      .from('audit_events')
      .select('id,user_id,event_type,resource_type,resource_id,action,changes,created_at,profiles(full_name,email)', 
        { count: 'exact' })

    // Apply filters
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // Apply sorting and pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + validLimit - 1)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If CSV format requested, convert and return
    if (format === 'csv') {
      const csv = convertToCSV(data ?? [])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Return JSON with pagination metadata
    return NextResponse.json({
      events: data ?? [],
      pagination: {
        page,
        limit: validLimit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / validLimit),
      },
    })
  } catch (error: any) {
    console.error('Audit log fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function convertToCSV(events: any[]): string {
  if (events.length === 0) {
    return 'No audit events found'
  }

  const headers = [
    'ID',
    'User',
    'Email',
    'Event Type',
    'Resource Type',
    'Resource ID',
    'Action',
    'Changes',
    'Timestamp',
  ]

  const rows = events.map((event) => [
    event.id,
    event.profiles?.full_name || 'Unknown',
    event.profiles?.email || 'Unknown',
    event.event_type,
    event.resource_type,
    event.resource_id,
    event.action,
    JSON.stringify(event.changes || {}),
    new Date(event.created_at).toISOString(),
  ])

  // Escape CSV values and join
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const stringCell = String(cell)
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell
        })
        .join(',')
    ),
  ].join('\n')

  return csvContent
}
