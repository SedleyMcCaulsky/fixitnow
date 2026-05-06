'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleSignOut = async () => {
    await fetch('/auth/signout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-2xl font-bold text-blue-600">
                FixItNow
              </Link>
              <div className="flex gap-4 flex-wrap">
                <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                  Projects
                </Link>
                <Link href="/dashboard/projects/new" className="text-gray-700 hover:text-blue-600">
                  New Project
                </Link>
                <Link href="/dashboard/vendors" className="text-gray-700 hover:text-blue-600">
                  My Work
                </Link>
                <Link href="/dashboard/vendors/apply" className="text-gray-700 hover:text-blue-600">
                  Vendor Apply
                </Link>
                <Link href="/dashboard/reports" className="text-gray-700 hover:text-blue-600">
                  Reports
                </Link>
                <Link href="/dashboard/admin/vendors" className="text-gray-700 hover:text-blue-600">
                  Vendor Approvals
                </Link>
                <Link href="/dashboard/admin/audit" className="text-gray-700 hover:text-blue-600">
                  Audit Logs
                </Link>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
