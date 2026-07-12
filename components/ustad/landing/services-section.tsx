import { serviceCategories } from '@/lib/data'
import { ServiceCard } from '../service-card'

export function ServicesSection() {
  return (
    <section id="services" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Popular services
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          Whatever needs fixing, there&apos;s a verified expert nearby.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {serviceCategories.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  )
}
