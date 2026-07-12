import Link from 'next/link'
import { Logo } from './logo'

const footerLinks: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'Plumbing', href: '#services' },
      { label: 'Electrical', href: '#services' },
      { label: 'Cleaning', href: '#services' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help center', href: '#' },
      { label: 'Safety', href: '#trust' },
      { label: 'Terms', href: '#' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Trusted, verified home service technicians across Islamabad &
              Rawalpindi. Upfront pricing, pay after completion.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerLinks.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {col.title}
                </h4>
                {col.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} USTAD. All rights reserved. Islamabad
            & Rawalpindi, Pakistan.
          </p>
        </div>
      </div>
    </footer>
  )
}
