import {
  Wrench,
  Zap,
  Cog,
  PaintRoller,
  SprayCan,
  Hammer,
  type LucideIcon,
} from 'lucide-react'

export type ServiceCategory = {
  id: string
  label: string
  description: string
  icon: LucideIcon
  /** tailwind classes for the soft tinted icon container */
  tint: string
}

export const serviceCategories: ServiceCategory[] = [
  {
    id: 'plumbing',
    label: 'Plumbing',
    description: 'Leaks, fittings & drainage',
    icon: Wrench,
    tint: 'bg-[#EAF1FE] text-primary',
  },
  {
    id: 'electrical',
    label: 'Electrical',
    description: 'Wiring, outlets & lighting',
    icon: Zap,
    tint: 'bg-[#FFF7E8] text-[#E0A100]',
  },
  {
    id: 'mechanic',
    label: 'Mechanic',
    description: 'AC, generators & motors',
    icon: Cog,
    tint: 'bg-[#F0EEFF] text-[#5B5BD6]',
  },
  {
    id: 'painting',
    label: 'Painting',
    description: 'Interior & exterior work',
    icon: PaintRoller,
    tint: 'bg-[#E6FAF4] text-success',
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    description: 'Deep clean & maintenance',
    icon: SprayCan,
    tint: 'bg-[#EAF1FE] text-primary',
  },
  {
    id: 'carpentry',
    label: 'Carpentry',
    description: 'Furniture & wood repair',
    icon: Hammer,
    tint: 'bg-[#FFF0EE] text-warning',
  },
]

export const areas: string[] = [
  'F-7, Islamabad',
  'F-8, Islamabad',
  'G-9, Islamabad',
  'G-11, Islamabad',
  'Bahria Town, Rawalpindi',
  'DHA Phase 2, Islamabad',
  'Saddar, Rawalpindi',
  'Gulberg Greens, Islamabad',
  'Bani Gala, Islamabad',
]

export type AvailabilityStatus = 'available' | 'busy'

export type ScheduleSlot = {
  time: string
  busy: boolean
}

export type ScheduleDay = {
  label: string
  date: string
  slots: ScheduleSlot[]
}

export type Review = {
  id: string
  name: string
  rating: number
  comment: string
  date: string
}

export type Technician = {
  id: string
  name: string
  initials: string
  specialty: string
  category: string
  rating: number
  reviewCount: number
  distanceKm: number
  status: AvailabilityStatus
  inspectionFee: number
  area: string
  experienceYears: number
  jobsCompleted: number
  about: string
  avatarTint: string
  schedule: ScheduleDay[]
  reviews: Review[]
}

export const defaultSchedule: ScheduleDay[] = [
  {
    label: 'Today',
    date: 'Jul 12',
    slots: [
      { time: '10:00 AM', busy: false },
      { time: '12:00 PM', busy: true },
      { time: '02:00 PM', busy: false },
      { time: '04:00 PM', busy: false },
      { time: '06:00 PM', busy: true },
    ],
  },
  {
    label: 'Tomorrow',
    date: 'Jul 13',
    slots: [
      { time: '09:00 AM', busy: false },
      { time: '11:00 AM', busy: false },
      { time: '01:00 PM', busy: false },
      { time: '03:00 PM', busy: true },
      { time: '05:00 PM', busy: false },
    ],
  },
  {
    label: 'Mon',
    date: 'Jul 14',
    slots: [
      { time: '10:00 AM', busy: false },
      { time: '12:00 PM', busy: false },
      { time: '02:00 PM', busy: true },
      { time: '04:00 PM', busy: false },
    ],
  },
]

const sampleReviews: Review[] = [
  {
    id: 'r1',
    name: 'Hina Tariq',
    rating: 5,
    comment:
      'Arrived on time and gave a clear quote before starting. Very professional and tidy work.',
    date: '2 weeks ago',
  },
  {
    id: 'r2',
    name: 'Bilal Ahmed',
    rating: 5,
    comment: 'Fixed my kitchen leak in under an hour. Fair pricing, no surprises.',
    date: '1 month ago',
  },
  {
    id: 'r3',
    name: 'Sana Mir',
    rating: 4,
    comment: 'Good work overall. Communication could be a little quicker but happy with the result.',
    date: '1 month ago',
  },
]

export const technicians: Technician[] = [
  {
    id: 'usman-khan',
    name: 'Usman Khan',
    initials: 'UK',
    specialty: 'Plumbing Specialist',
    category: 'plumbing',
    rating: 4.9,
    reviewCount: 214,
    distanceKm: 1.2,
    status: 'available',
    inspectionFee: 200,
    area: 'F-7, Islamabad',
    experienceYears: 8,
    jobsCompleted: 1240,
    about:
      'Certified plumber with 8 years of experience across residential and commercial projects in Islamabad. Specializes in leak detection, pipe fitting, and bathroom installations.',
    avatarTint: 'bg-[#EAF1FE] text-primary',
    schedule: defaultSchedule,
    reviews: sampleReviews,
  },
  {
    id: 'adnan-raza',
    name: 'Adnan Raza',
    initials: 'AR',
    specialty: 'Electrician',
    category: 'electrical',
    rating: 4.8,
    reviewCount: 176,
    distanceKm: 2.4,
    status: 'available',
    inspectionFee: 250,
    area: 'G-9, Islamabad',
    experienceYears: 6,
    jobsCompleted: 890,
    about:
      'Licensed electrician handling wiring, DB installation, lighting, and fault finding. Safety-first approach with upfront estimates.',
    avatarTint: 'bg-[#FFF7E8] text-[#E0A100]',
    schedule: defaultSchedule,
    reviews: sampleReviews,
  },
  {
    id: 'faisal-mehmood',
    name: 'Faisal Mehmood',
    initials: 'FM',
    specialty: 'AC & Appliance Mechanic',
    category: 'mechanic',
    rating: 4.7,
    reviewCount: 132,
    distanceKm: 3.1,
    status: 'busy',
    inspectionFee: 300,
    area: 'Bahria Town, Rawalpindi',
    experienceYears: 10,
    jobsCompleted: 1520,
    about:
      'Expert in AC servicing, generator maintenance, and home appliances. Ten years of hands-on experience across the twin cities.',
    avatarTint: 'bg-[#F0EEFF] text-[#5B5BD6]',
    schedule: defaultSchedule,
    reviews: sampleReviews,
  },
  {
    id: 'zeeshan-ali',
    name: 'Zeeshan Ali',
    initials: 'ZA',
    specialty: 'Painter',
    category: 'painting',
    rating: 4.9,
    reviewCount: 98,
    distanceKm: 1.9,
    status: 'available',
    inspectionFee: 0,
    area: 'DHA Phase 2, Islamabad',
    experienceYears: 7,
    jobsCompleted: 640,
    about:
      'Interior and exterior painting with premium finishes. Free inspection and detailed surface prep for long-lasting results.',
    avatarTint: 'bg-[#E6FAF4] text-success',
    schedule: defaultSchedule,
    reviews: sampleReviews,
  },
  {
    id: 'kamran-shah',
    name: 'Kamran Shah',
    initials: 'KS',
    specialty: 'Deep Cleaning Expert',
    category: 'cleaning',
    rating: 4.6,
    reviewCount: 87,
    distanceKm: 4.3,
    status: 'busy',
    inspectionFee: 0,
    area: 'Saddar, Rawalpindi',
    experienceYears: 5,
    jobsCompleted: 410,
    about:
      'Full home deep cleaning, post-construction cleanup, and sofa/carpet shampooing with eco-friendly products.',
    avatarTint: 'bg-[#EAF1FE] text-primary',
    schedule: defaultSchedule,
    reviews: sampleReviews,
  },
  {
    id: 'naveed-akhtar',
    name: 'Naveed Akhtar',
    initials: 'NA',
    specialty: 'Carpenter',
    category: 'carpentry',
    rating: 4.8,
    reviewCount: 121,
    distanceKm: 2.8,
    status: 'available',
    inspectionFee: 200,
    area: 'G-11, Islamabad',
    experienceYears: 12,
    jobsCompleted: 1030,
    about:
      'Custom furniture, door and window repair, and modular kitchen work. Twelve years of craftsmanship you can trust.',
    avatarTint: 'bg-[#FFF0EE] text-warning',
    schedule: defaultSchedule,
    reviews: sampleReviews,
  },
]

export function getTechnician(id: string): Technician | undefined {
  return technicians.find((t) => t.id === id)
}

export function getFirstAvailableTechnicianByCategory(category: string): Technician | undefined {
  return technicians.find((t) => t.category === category && t.status === 'available') || technicians.find((t) => t.category === category)
}

export type JobStatusKey =
  | 'requested'
  | 'quote_sent'
  | 'approved'
  | 'in_progress'
  | 'completed'
  | 'payment_confirmed'

export type JobStep = {
  key: JobStatusKey
  label: string
  description: string
  timestamp: string | null
}

export type Job = {
  id: string
  service: string
  technicianId: string
  technicianName: string
  technicianInitials: string
  technicianPhone: string
  area: string
  createdAt: string
  quoteAmount: number
  currentStep: JobStatusKey
  steps: JobStep[]
  customerConfirmed: boolean
  technicianConfirmed: boolean
}

export const sampleJob: Job = {
  id: 'JOB-2481',
  service: 'Kitchen sink leak repair',
  technicianId: 'usman-khan',
  technicianName: 'Usman Khan',
  technicianInitials: 'UK',
  technicianPhone: '+92 300 1234567',
  area: 'F-7, Islamabad',
  createdAt: 'Jul 12, 2026',
  quoteAmount: 2500,
  currentStep: 'in_progress',
  customerConfirmed: false,
  technicianConfirmed: false,
  steps: [
    {
      key: 'requested',
      label: 'Requested',
      description: 'Job request sent to technician',
      timestamp: 'Jul 12, 09:14 AM',
    },
    {
      key: 'quote_sent',
      label: 'Quote Sent',
      description: 'Technician shared a fixed quote',
      timestamp: 'Jul 12, 09:42 AM',
    },
    {
      key: 'approved',
      label: 'Approved',
      description: 'You approved the quote',
      timestamp: 'Jul 12, 10:05 AM',
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      description: 'Technician is working on the job',
      timestamp: 'Jul 12, 11:20 AM',
    },
    {
      key: 'completed',
      label: 'Completed',
      description: 'Work finished, awaiting confirmation',
      timestamp: null,
    },
    {
      key: 'payment_confirmed',
      label: 'Payment Confirmed',
      description: 'Cash payment confirmed by both parties',
      timestamp: null,
    },
  ],
}

export function formatPKR(amount: number): string {
  return `Rs ${amount.toLocaleString('en-PK')}`
}
