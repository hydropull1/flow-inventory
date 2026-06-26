import Badge from "@/components/Badge";
import Button from "@/components/Button";

const valueStrip = [
  {
    title: "Revenue Recovery",
    body: "Identify denied claims that are ready for appeal.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Documentation Review",
    body: "Flag missing X-rays, narratives, perio charts, and clinical evidence.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Appeal Packet Drafting",
    body: "Generate payer-ready appeal letters, narratives, and resubmission steps.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h16v14H4z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 7l8 5 8-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const proofFeatures = [
  {
    title: "EOB denial analysis",
    body: "Parse payer denial language to pinpoint why the claim was rejected.",
  },
  {
    title: "Clinical narrative generation",
    body: "Translate clinical notes into a concise narrative of necessity.",
  },
  {
    title: "Missing document checklist",
    body: "Surface the radiographs, charting, and records still required.",
  },
  {
    title: "Human review workflow",
    body: "Every packet is drafted for billing review before submission.",
  },
  {
    title: "Saved appeal drafts",
    body: "Keep generated packets organized and ready to revisit.",
  },
  {
    title: "Resubmission preparation",
    body: "Step-by-step actions so nothing is missed when resubmitting.",
  },
];

const painPoints = [
  {
    title: "Manual appeals eat hours",
    body: "Billing teams read EOBs line by line and rewrite the same appeal language for every denied claim.",
  },
  {
    title: "Repeated denials",
    body: "Claims come back denied again when radiographs, charting, or narratives are missing the first time.",
  },
  {
    title: "Notes aren't payer-ready",
    body: "Clinical notes have to be translated into a narrative of necessity that payers will actually accept.",
  },
  {
    title: "Appeals slip through",
    body: "When the front desk is busy, denied claims sit untouched and timely-filing windows quietly close.",
  },
];

const steps = [
  {
    step: "1",
    title: "Paste the claim details",
    body: "Add the denial reason, EOB text, and clinical notes. Use demo or redacted data only.",
  },
  {
    step: "2",
    title: "AI flags the gaps",
    body: "QuickClaim AI identifies missing documentation and risk issues that could trigger another denial.",
  },
  {
    step: "3",
    title: "Review the packet",
    body: "Read the generated appeal letter, narrative, and checklists — edit anything you need.",
  },
  {
    step: "4",
    title: "Save and submit",
    body: "Save the draft to your dashboard and submit after human review.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$299",
    cadence: "/month",
    blurb: "For a single dental office billing team getting started.",
    features: [
      "AI appeal packet generation",
      "Missing-document checklists",
      "Saved appeal history",
      "Email support",
    ],
    cta: "Start Demo",
    href: "/appeals/new",
    highlight: false,
  },
  {
    name: "Growth",
    price: "$499",
    cadence: "/month",
    blurb: "For busy practices recovering claims at higher volume.",
    features: [
      "Everything in Starter",
      "Higher monthly appeal volume",
      "Clinical narrative generation",
      "Priority support",
    ],
    cta: "Start Demo",
    href: "/appeals/new",
    highlight: true,
  },
  {
    name: "Multi-location",
    price: "Custom",
    cadence: "",
    blurb: "For DSOs and groups managing billing across offices.",
    features: [
      "Multiple locations",
      "Team roles & access",
      "Reporting & analytics",
      "Dedicated support",
    ],
    cta: "View Dashboard",
    href: "/dashboard",
    highlight: false,
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
      {children}
    </p>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WorkflowPreview() {
  const rows = [
    {
      label: "Claim denied",
      meta: "D2740 · Delta Dental · $1,180",
      state: "done",
    },
    {
      label: "Missing documentation flagged",
      meta: "Radiographs · Narrative · Perio charting",
      state: "done",
    },
    {
      label: "Appeal packet generated",
      meta: "Letter · Narrative · Resubmission steps",
      state: "done",
    },
    {
      label: "Ready for review",
      meta: "Awaiting billing manager approval",
      state: "active",
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Appeal workflow
        </p>
        <Badge tone="blue" dot>
          Generated by Claude
        </Badge>
      </div>
      <div className="px-5 py-5">
        <ol className="relative flex flex-col gap-1">
          {rows.map((row, i) => {
            const isLast = i === rows.length - 1;
            const active = row.state === "active";
            return (
              <li key={row.label} className="relative flex gap-3.5 pb-5 last:pb-0">
                {!isLast && (
                  <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" />
                )}
                <span
                  className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    active
                      ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  {active ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  ) : (
                    <CheckIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">
                      {row.label}
                    </p>
                    {active && <Badge tone="amber">Pending</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {row.meta}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/60">
        <div className="px-5 py-3.5">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Revenue at risk
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">$1,180</p>
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Confidence
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full w-[78%] rounded-full bg-blue-600" />
            </div>
            <span className="text-xs font-semibold text-slate-700">78%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/70 bg-slate-50">
        <div className="absolute inset-x-0 top-0 -z-10 h-full bg-[radial-gradient(70%_60%_at_80%_-10%,rgba(37,99,235,0.06),transparent)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-14 sm:pt-20 lg:grid-cols-2 lg:gap-12">
          <div className="max-w-xl">
            <Badge tone="blue" dot>
              For dental billing teams
            </Badge>
            <h1 className="mt-6 text-[2.5rem] font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-[3.25rem]">
              Stop losing revenue to denied dental insurance claims.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600">
              QuickClaim AI helps dental billing teams turn denied claims, EOB
              notes, and clinical documentation into appeal-ready packets in
              minutes — so offices can recover revenue faster and reduce manual
              billing work.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/appeals/new" size="lg">
                Start Demo
              </Button>
              <Button href="/dashboard" size="lg" variant="secondary">
                View Dashboard
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {[
                "Recover more revenue",
                "Reduce manual appeal work",
                "Generate appeal packets in minutes",
              ].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
                >
                  <CheckIcon className="h-3.5 w-3.5 text-blue-600" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="lg:pl-6">
            <WorkflowPreview />
          </div>
        </div>
      </section>

      {/* Business-value strip */}
      <section className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 sm:grid-cols-3">
          {valueStrip.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                {item.icon}
              </div>
              <p className="mt-5 text-base font-semibold text-slate-900">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pain */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Denied claims cost dental offices time and money.
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Recoverable revenue slips away when appeals are slow, manual, and
            easy to deprioritize.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {painPoints.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <h3 className="text-base font-semibold text-slate-900">
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Proof — built for dental billing workflows */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl">
            <Eyebrow>The platform</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Built for dental billing workflows.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Every step of the denial-to-resubmission process, in one place.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {proofFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200/80">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow timeline */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            From denial to review-ready packet
          </h2>
        </div>
        <div className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <div className="absolute left-0 right-0 top-5 -z-10 hidden h-px bg-slate-200 lg:block" />
          {steps.map((s) => (
            <div key={s.step} className="relative">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-900 shadow-sm">
                {s.step}
              </span>
              <h3 className="mt-5 text-base font-semibold text-slate-900">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ROI */}
      <section className="border-y border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="overflow-hidden rounded-3xl bg-slate-900 px-8 py-16 sm:px-14">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow>
                <span className="text-blue-300">Return on investment</span>
              </Eyebrow>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                One recovered claim can pay for the tool.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                A single denied crown, SRP, implant-related, or perio claim can
                represent hundreds or thousands in revenue. QuickClaim AI helps
                billing teams act faster before appeals get buried in the daily
                workload.
              </p>
              <div className="mt-9 flex justify-center">
                <Button href="/appeals/new" size="lg" variant="secondary">
                  Start Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Pricing preview</Eyebrow>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Simple plans for billing teams
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Pricing shown for preview only. Billing is not enabled in this demo.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-5xl items-start gap-6 lg:grid-cols-3">
          {pricing.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl bg-white p-8 ${
                plan.highlight
                  ? "border-2 border-slate-900 shadow-md lg:-translate-y-3"
                  : "border border-slate-200 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">
                  {plan.name}
                </h3>
                {plan.highlight && <Badge tone="blue">Most popular</Badge>}
              </div>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-slate-900">
                  {plan.price}
                </span>
                <span className="text-sm text-slate-500">{plan.cadence}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {plan.blurb}
              </p>
              <ul className="mt-7 flex flex-1 flex-col gap-3.5 text-sm text-slate-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-900" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                href={plan.href}
                variant={plan.highlight ? "primary" : "secondary"}
                className="mt-8 w-full"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-200/70 bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-8 py-16 text-center sm:px-14">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Generate your first appeal packet in minutes.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-slate-600">
              Try the full workflow with demo data — no login, no setup, no real
              patient information.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href="/appeals/new" size="lg">
                Start Demo
              </Button>
              <Button href="/dashboard" size="lg" variant="secondary">
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Disclaimer
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            QuickClaim AI is for billing workflow support only. It does not
            guarantee reimbursement, claim approval, or payer acceptance. Human
            review is required before submission. Demo data only.
          </p>
        </div>
      </section>
    </main>
  );
}
