import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-16 px-6 sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <section className="rounded-3xl bg-white shadow-lg ring-1 ring-slate-200 p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">FixItNow</p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Smart project delivery for contractors and customers.</h1>
              <p className="text-lg leading-8 text-slate-600">
                Launch work requests, build contractor teams, submit milestones, and track approvals with immutable audit trails and role-based access control.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                  Get started
                </Link>
                <Link href="/signup" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                  Create account
                </Link>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">MVP stack</p>
              <ul className="mt-6 space-y-3 text-sm leading-6">
                <li>• Supabase Auth + Postgres</li>
                <li>• Immutable audit logs</li>
                <li>• Roles & permissions</li>
                <li>• Projects, teams, milestones</li>
                <li>• Pricing engine + approvals</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {[
            { title: 'Create projects', description: 'Customers can launch new work requests with scope, parish, and budget ceilings.' },
            { title: 'Build teams', description: 'Assign approved vendors to project teams, then monitor costs and schedules.' },
            { title: 'Approve milestones', description: 'Submit, approve, dispute, and audit every payment stage.' },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{item.title}</h2>
              <p className="mt-4 text-slate-600">{item.description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
