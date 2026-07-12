'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Bell,
  LogOut,
  Trash2,
  Lock,
  ChevronRight,
  Plus,
  Trash,
  Check,
  Settings,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomerLayout } from '@/components/ustad/customer-layout'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from '@/lib/i18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

function ProfilePageContent() {
  const router = useRouter()
  const { t, locale, changeLanguage, isRtl } = useTranslation()

  // Skeletons
  const [loading, setLoading] = useState(true)

  // Account Type
  const [accountType, setAccountType] = useState<'customer' | 'technician'>('customer')

  // Editable Profile
  const [name, setName] = useState('Kamran Malik')
  const [email, setEmail] = useState('kamran.malik@outlook.com')
  const [phone, setPhone] = useState('300 1234567')
  const [avatarTint, setAvatarTint] = useState('bg-[#EAF1FE] text-primary')

  // Saved Addresses
  const [addresses, setAddresses] = useState<string[]>([
    'House 42, Street 18, F-7/2, Islamabad',
    'Office 301, Centaurus Mall, G-8, Islamabad',
  ])
  const [newAddress, setNewAddress] = useState('')
  const [showAddressInput, setShowAddressInput] = useState(false)

  // Notification toggles
  const [jobUpdates, setJobUpdates] = useState(true)
  const [promotions, setPromotions] = useState(false)

  // Modals Toggles
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [newPhone, setNewPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [phoneOtp, setPhoneOtp] = useState('')
  
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Technician Specific Settings
  const [isTechOnline, setIsTechOnline] = useState(true)
  const [techCategories, setTechCategories] = useState<string[]>(['plumbing'])
  const [techRadius, setTechRadius] = useState(15)

  // Hydration sync
  useEffect(() => {
    // Read from localStorage on mount
    const savedType = localStorage.getItem('ustad_account_type') as 'customer' | 'technician'
    if (savedType) setAccountType(savedType)

    const savedName = localStorage.getItem('ustad_name')
    if (savedName) setName(savedName)

    const savedEmail = localStorage.getItem('ustad_email')
    if (savedEmail) setEmail(savedEmail)

    const savedPhone = localStorage.getItem('ustad_phone')
    if (savedPhone) setPhone(savedPhone)

    const savedAddresses = localStorage.getItem('ustad_addresses')
    if (savedAddresses) setAddresses(JSON.parse(savedAddresses))

    const savedUpdates = localStorage.getItem('ustad_notif_updates')
    if (savedUpdates) setJobUpdates(savedUpdates === 'true')

    const savedPromo = localStorage.getItem('ustad_notif_promo')
    if (savedPromo) setPromotions(savedPromo === 'true')

    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  // Sync edits to localStorage
  const handleSaveProfile = () => {
    localStorage.setItem('ustad_name', name)
    localStorage.setItem('ustad_email', email)
    alert(locale === 'ur' ? 'پروفائل کامیابی سے محفوظ ہو گئی!' : 'Profile saved successfully!')
  }

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAddress.trim()) return
    const updated = [...addresses, newAddress.trim()]
    setAddresses(updated)
    localStorage.setItem('ustad_addresses', JSON.stringify(updated))
    setNewAddress('')
    setShowAddressInput(false)
  }

  const handleDeleteAddress = (index: number) => {
    const updated = addresses.filter((_, i) => i !== index)
    setAddresses(updated)
    localStorage.setItem('ustad_addresses', JSON.stringify(updated))
  }

  const handleSendPhoneOtp = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPhone.replace(/\D/g, '').length < 10) return
    setOtpSent(true)
  }

  const handleConfirmPhoneChange = (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneOtp.length < 6) return
    setPhone(newPhone)
    localStorage.setItem('ustad_phone', newPhone)
    setShowPhoneModal(false)
    setOtpSent(false)
    setNewPhone('')
    setPhoneOtp('')
  }

  const handleNotificationChange = (type: 'updates' | 'promo') => {
    if (type === 'updates') {
      const next = !jobUpdates
      setJobUpdates(next)
      localStorage.setItem('ustad_notif_updates', String(next))
    } else {
      const next = !promotions
      setPromotions(next)
      localStorage.setItem('ustad_notif_promo', String(next))
    }
  }

  const handleLanguageChange = (newLocale: 'en' | 'ur') => {
    if (newLocale === locale) return
    setIsSwitching(true)
    setTimeout(() => {
      changeLanguage(newLocale)
      setIsSwitching(false)
    }, 300)
  }

  const handleLogout = () => {
    if (confirm(locale === 'ur' ? 'کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟' : 'Are you sure you want to log out?')) {
      localStorage.removeItem('ustad_account_type')
      router.push('/login')
    }
  }

  const handleDeleteAccount = () => {
    localStorage.clear()
    router.push('/signup')
  }

  const toggleCategory = (catId: string) => {
    if (techCategories.includes(catId)) {
      setTechCategories(techCategories.filter(c => c !== catId))
    } else {
      setTechCategories([...techCategories, catId])
    }
  }

  return (
    <CustomerLayout>
      <div className="min-h-dvh bg-background pb-20">
        <AppTopbar />

        <main className="mx-auto w-full max-w-xl px-4 py-5 flex flex-col gap-5">
          {loading ? (
            // skeletons loader
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 py-4">
                <Skeleton className="size-16 rounded-full" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              {/* Profile Header Card */}
              <div className="flex items-center gap-4 py-3 border-b border-border/40">
                <button
                  onClick={() => {
                    // Randomly cycle avatar presets
                    const tints = [
                      'bg-[#EAF1FE] text-primary',
                      'bg-[#FFF7E8] text-[#E0A100]',
                      'bg-[#F0EEFF] text-[#5B5BD6]',
                      'bg-[#E6FAF4] text-[#10B981]'
                    ]
                    const nextIndex = (tints.indexOf(avatarTint) + 1) % tints.length
                    setAvatarTint(tints[nextIndex])
                  }}
                  className={cn(
                    "flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-bold border border-border shadow-sm hover:scale-105 active:scale-95 transition-all tap",
                    avatarTint
                  )}
                  title={t('profile.change_avatar')}
                >
                  {name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </button>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <h1 className="text-xl font-bold tracking-tight text-foreground truncate">{name}</h1>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="size-3.5" />
                    <span>+92 {phone}</span>
                    <button
                      onClick={() => setShowPhoneModal(true)}
                      className="ms-1.5 text-primary hover:underline font-semibold tap"
                    >
                      {t('profile.change_number')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Editable Fields Section */}
              <Card className="soft-shadow border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <User className="size-4.5 text-primary" />
                    Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* Name field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">{t('profile.name_label')}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-border bg-muted p-2.5 text-sm text-foreground outline-none focus:border-primary focus:bg-background"
                    />
                  </div>

                  {/* Email field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">{t('profile.email_label')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-border bg-muted p-2.5 text-sm text-foreground outline-none focus:border-primary focus:bg-background"
                    />
                  </div>

                  <Button size="sm" className="tap w-fit mt-1" onClick={handleSaveProfile}>
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              {/* Saved Addresses list */}
              <Card className="soft-shadow border-border">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <MapPin className="size-4.5 text-primary" />
                    {t('profile.addresses_label')}
                  </CardTitle>
                  <button
                    onClick={() => setShowAddressInput((prev) => !prev)}
                    className="tap flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/15"
                  >
                    <Plus className="size-4" />
                  </button>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {/* Address input form */}
                  {showAddressInput && (
                    <form onSubmit={handleAddAddress} className="flex gap-2 mb-1">
                      <input
                        type="text"
                        placeholder="Enter full address details..."
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        className="flex-1 rounded-xl border border-border bg-muted p-2.5 text-xs text-foreground outline-none focus:border-primary focus:bg-background"
                      />
                      <Button type="submit" size="xs" className="h-10 px-3 shrink-0">Add</Button>
                    </form>
                  )}

                  {addresses.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-2">No saved addresses yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {addresses.map((addr, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
                          <span className="text-foreground truncate flex-1 leading-normal">{addr}</span>
                          <button
                            onClick={() => handleDeleteAddress(index)}
                            className="text-muted-foreground/60 hover:text-destructive tap p-1 rounded-lg hover:bg-muted"
                          >
                            <Trash className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Technician Specific settings (conditionally rendered) */}
              {accountType === 'technician' && (
                <Card className="soft-shadow border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                      <Settings className="size-4.5 text-primary" />
                      {t('profile.tech_settings_label')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {/* Online Toggle */}
                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                      <span className="text-xs font-semibold text-foreground">{t('profile.online_offline_state')}</span>
                      <button
                        onClick={() => setIsTechOnline(!isTechOnline)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          isTechOnline ? "bg-success" : "bg-muted-foreground/30"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                          isRtl 
                            ? (isTechOnline ? "-translate-x-5" : "translate-x-0")
                            : (isTechOnline ? "translate-x-5" : "translate-x-0")
                        )} />
                      </button>
                    </div>

                    {/* Specialty check categories */}
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-semibold text-foreground">{t('profile.service_categories')}</span>
                      <div className="grid grid-cols-2 gap-2">
                        {['plumbing', 'electrical', 'carpentry', 'mechanic'].map((cat) => {
                          const isChecked = techCategories.includes(cat)
                          return (
                            <button
                              key={cat}
                              onClick={() => toggleCategory(cat)}
                              className={cn(
                                "tap flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium capitalize",
                                isChecked ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground"
                              )}
                            >
                              <span className={cn(
                                "flex size-4 shrink-0 items-center justify-center rounded border",
                                isChecked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                              )}>
                                {isChecked && <Check className="size-3" />}
                              </span>
                              {cat}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Service radius slider */}
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{t('profile.service_radius')}</span>
                        <span className="font-bold text-primary font-mono">{t('profile.radius_miles', { radius: String(techRadius) })}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={techRadius}
                        onChange={(e) => setTechRadius(Number(e.target.value))}
                        className="w-full accent-primary bg-muted rounded-lg appearance-none h-1.5 cursor-pointer"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* App Settings Card */}
              <Card className="soft-shadow border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Globe className="size-4.5 text-primary" />
                    {t('profile.settings_label')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* Language Selector Toggle */}
                  <div className="flex items-center justify-between border-b border-border/50 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{t('profile.language_label')}</span>
                      {isSwitching && (
                        <span className="flex size-1.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                        </span>
                      )}
                    </div>
                    <div className="flex rounded-xl bg-muted p-1">
                      <button
                        onClick={() => handleLanguageChange('en')}
                        disabled={isSwitching}
                        className={cn(
                          "tap rounded-lg px-3 py-1 text-xs font-bold transition-all",
                          locale === 'en'
                            ? "bg-card text-primary shadow-sm"
                            : "text-muted-foreground/80 hover:text-foreground"
                        )}
                      >
                        English
                      </button>
                      <button
                        onClick={() => handleLanguageChange('ur')}
                        disabled={isSwitching}
                        className={cn(
                          "tap rounded-lg px-3 py-1 text-xs font-bold transition-all",
                          locale === 'ur'
                            ? "bg-card text-primary shadow-sm"
                            : "text-muted-foreground/80 hover:text-foreground"
                        )}
                      >
                        اردو
                      </button>
                    </div>
                  </div>

                  {/* Notification switches */}
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Bell className="size-3.5" />
                      {t('profile.notification_preferences')}
                    </span>

                    {/* Job Updates Switch */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('profile.job_updates')}</span>
                      <button
                        onClick={() => handleNotificationChange('updates')}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          jobUpdates ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                          isRtl 
                            ? (jobUpdates ? "-translate-x-5" : "translate-x-0")
                            : (jobUpdates ? "translate-x-5" : "translate-x-0")
                        )} />
                      </button>
                    </div>

                    {/* Promotions Switch */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('profile.promotions')}</span>
                      <button
                        onClick={() => handleNotificationChange('promo')}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          promotions ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                      >
                        <span className={cn(
                          "pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                          isRtl 
                            ? (promotions ? "-translate-x-5" : "translate-x-0")
                            : (promotions ? "translate-x-5" : "translate-x-0")
                        )} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Destructive Buttons Section */}
              <div className="flex flex-col gap-3.5 mt-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="tap h-12 w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive font-semibold bg-transparent"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4.5 mr-2" />
                  {t('profile.logout')}
                </Button>

                {/* Account deletion collapsible/dialog trigger */}
                <div className="border-t border-border/40 mt-3 pt-4 flex flex-col gap-2">
                  <h3 className="text-xs font-bold text-destructive/80 uppercase tracking-wider">{t('profile.danger_zone')}</h3>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="tap flex items-center justify-between p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-left text-destructive transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="size-4" />
                      <span className="font-semibold">{t('profile.delete_account')}</span>
                    </div>
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Change Phone OTP Dialog (Simulated) */}
        <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{t('profile.change_phone_title')}</DialogTitle>
              <DialogDescription>
                We will send an SMS verification OTP to this new number.
              </DialogDescription>
            </DialogHeader>

            {!otpSent ? (
              <form onSubmit={handleSendPhoneOtp} className="flex flex-col gap-4 py-2">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3">
                  <span className="text-xs font-semibold text-muted-foreground">+92</span>
                  <input
                    type="tel"
                    placeholder="300 1234567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="h-11 w-full bg-transparent text-xs text-foreground outline-none focus:bg-transparent"
                  />
                </div>
                <Button type="submit" disabled={newPhone.replace(/\D/g, '').length < 10} className="tap h-11 w-full">
                  Send OTP Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleConfirmPhoneChange} className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-1 text-center">
                  <span className="text-xs text-muted-foreground">OTP code sent to +92 {newPhone}</span>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={phoneOtp}
                  onChange={(e) => setPhoneOtp(e.target.value)}
                  className="h-11 w-full text-center tracking-widest text-sm rounded-xl border border-border bg-muted outline-none focus:border-primary focus:bg-background font-mono"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="tap flex-1 bg-transparent"
                    onClick={() => setOtpSent(false)}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={phoneOtp.length < 6} className="tap flex-1">
                    Verify & Save
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Account Danger Dialog */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="items-center text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
                <AlertTriangle className="size-5.5" />
              </div>
              <DialogTitle className="text-destructive font-bold">{t('profile.delete_confirm_title')}</DialogTitle>
              <DialogDescription className="text-center mt-1.5 leading-normal">
                {t('profile.delete_confirm_desc')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2 mt-2">
              <Button variant="destructive" className="tap h-11" onClick={handleDeleteAccount}>
                {t('profile.delete_confirm_btn')}
              </Button>
              <Button variant="outline" className="tap h-11 bg-transparent border-border" onClick={() => setShowDeleteModal(false)}>
                {t('profile.cancel')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CustomerLayout>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading Profile Page...</div>}>
      <ProfilePageContent />
    </Suspense>
  )
}
