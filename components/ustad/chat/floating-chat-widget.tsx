'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare,
  Send,
  X,
  Wrench,
  Zap,
  Cog,
  PaintRoller,
  SprayCan,
  Hammer,
  Sparkles,
  Info,
  RotateCcw,
  User,
  FileText,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'
import { formatPKR } from '@/lib/data'
import { createClient } from '@/lib/supabase/client'

// Configurable Avatar Asset List (8 pixel art animal characters)
export const AVATAR_LIST = [
  '/avatars/avatar1.png', // Fox
  '/avatars/avatar2.png', // Squirrel / Chipmunk
  '/avatars/avatar3.png', // Pink Cat
  '/avatars/avatar4.png', // Otter / Ferret
  '/avatars/avatar5.png', // Blue Bunny
  '/avatars/avatar6.png', // Piglet
  '/avatars/avatar7.png', // Dog / Bear
  '/avatars/avatar8.png', // Mouse / Panda
]

// Single customizable size variable (px)
const ICON_SIZE_PX = 56

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCall?: {
    name: string
    args: any
  }
}

const CUTE_SPEECH_MESSAGES = [
  "Need help?",
  "Ask me anything!",
  "Got a question?",
  "Get price estimate!",
  "Book a technician!",
]

export function FloatingChatWidget() {
  const router = useRouter()
  const { locale } = useTranslation()

  // 1. Avatar selection logic:
  // Selected once on mount / navigation session, fixed for the entire visit.
  const [avatarSrc, setAvatarSrc] = useState<string>(AVATAR_LIST[0])
  const [isOpen, setIsOpen] = useState(false)
  const [speechBubbleText, setSpeechBubbleText] = useState<string>('')
  const [showSpeechBubble, setShowSpeechBubble] = useState(false)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimitCount, setRateLimitCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const widgetRef = useRef<HTMLDivElement | null>(null)

  // Category Icons map
  const categoryIcons: Record<string, any> = {
    plumbing: Wrench,
    electrical: Zap,
    mechanic: Cog,
    painting: PaintRoller,
    cleaning: SprayCan,
    carpentry: Hammer,
  }

  // Session-bound avatar initialization (never changes mid-session)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let storedIndex = sessionStorage.getItem('ustad_floating_avatar_index')
      if (storedIndex === null) {
        // Pick a random avatar index for this visit session
        const randomIndex = Math.floor(Math.random() * AVATAR_LIST.length)
        storedIndex = String(randomIndex)
        sessionStorage.setItem('ustad_floating_avatar_index', storedIndex)
      }
      const indexNum = Math.min(Math.max(parseInt(storedIndex, 10) || 0, 0), AVATAR_LIST.length - 1)
      setAvatarSrc(AVATAR_LIST[indexNum])
    }
  }, [])

  // Speech bubble timing behavior
  useEffect(() => {
    if (isOpen) {
      setShowSpeechBubble(false)
      return
    }

    // Delay 2s before showing initial speech bubble
    const timer1 = setTimeout(() => {
      const msg = CUTE_SPEECH_MESSAGES[Math.floor(Math.random() * CUTE_SPEECH_MESSAGES.length)]
      setSpeechBubbleText(msg)
      setShowSpeechBubble(true)

      // Hide after 7s
      const timer2 = setTimeout(() => {
        setShowSpeechBubble(false)
      }, 7000)

      return () => clearTimeout(timer2)
    }, 2000)

    // Repeat speech bubble every 24s
    const interval = setInterval(() => {
      if (!isOpen) {
        const msg = CUTE_SPEECH_MESSAGES[Math.floor(Math.random() * CUTE_SPEECH_MESSAGES.length)]
        setSpeechBubbleText(msg)
        setShowSpeechBubble(true)
        setTimeout(() => setShowSpeechBubble(false), 7000)
      }
    }, 24000)

    return () => {
      clearTimeout(timer1)
      clearInterval(interval)
    }
  }, [isOpen])

  // Initialize message history & rate limits
  useEffect(() => {
    // 1. Rate limits
    const today = new Date().toDateString()
    let count = 0
    try {
      const storedLimitDay = localStorage.getItem('ustad_chat_limit_day')
      if (storedLimitDay === today) {
        count = Number(localStorage.getItem('ustad_chat_limit_count') || '0')
      } else {
        localStorage.setItem('ustad_chat_limit_day', today)
        localStorage.setItem('ustad_chat_limit_count', '0')
      }
    } catch (e) {}
    setRateLimitCount(count)

    // 2. Load session chat history or set default welcome message
    try {
      const savedSessionMessages = sessionStorage.getItem('ustad_floating_chat_history')
      if (savedSessionMessages) {
        const parsed = JSON.parse(savedSessionMessages)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed)
          return
        }
      }
    } catch (e) {}

    const defaultGreeting: Message = {
      id: 'welcome',
      role: 'assistant',
      content: locale === 'ur'
        ? 'السلام علیکم! میں استاد کا لائیو چیٹ اسسٹنٹ ہوں۔ میں آپ کی بکنگ اور قیمتوں کے اندازے میں مدد کر سکتا ہوں۔'
        : 'Asalam-o-Alaikum! I am your USTAD AI Assistant. I can help you check prices, find technicians, or create a booking card.',
    }
    setMessages([defaultGreeting])
  }, [locale])

  // Auto-scroll when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, isOpen])

  const saveFloatingHistory = (updated: Message[]) => {
    try {
      sessionStorage.setItem('ustad_floating_chat_history', JSON.stringify(updated))
    } catch (e) {}
  }

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim()
    if (!trimmed || loading) return

    if (rateLimitCount >= 1000) return

    const newCount = rateLimitCount + 1
    setRateLimitCount(newCount)
    try {
      localStorage.setItem('ustad_chat_limit_count', String(newCount))
    } catch (e) {}

    const userMsg: Message = {
      id: 'msg_' + Math.random(),
      role: 'user',
      content: trimmed,
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    saveFloatingHistory(updatedMessages)
    setInput('')
    setLoading(true)

    const assistantMsgId = 'msg_' + Math.random()
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    }
    setMessages((prev) => [...prev, assistantPlaceholder])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          locale,
        }),
      })

      if (!response.ok) {
        throw new Error('API server returned error')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let toolCallJson = ''
      let isParsingTool = false

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          if (chunk.includes('__TOOL_CALL__:')) {
            const parts = chunk.split('__TOOL_CALL__:')
            assistantText += parts[0]
            toolCallJson = parts[1]
            isParsingTool = true
          } else if (isParsingTool) {
            toolCallJson += chunk
          } else {
            assistantText += chunk
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: assistantText.trim() }
                : m
            )
          )
        }

        if (toolCallJson) {
          try {
            const parsedTool = JSON.parse(toolCallJson.trim())
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, toolCall: parsedTool }
                  : m
              )
            )
          } catch (e) {
            console.error('Failed parsing tool call json:', e)
          }
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: locale === 'ur' ? 'معذرت، نیٹ ورک کا مسئلہ پیش آیا ہے۔' : 'Apologies, I am currently unable to reach the chat server. Please try again.' }
            : m
        )
      )
    } finally {
      setLoading(false)
      setMessages((prev) => {
        saveFloatingHistory(prev)
        return prev
      })
    }
  }

  const handleConfirmDraftBooking = async (args: any) => {
    const bookingId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const customerId = user?.id || '00000000-0000-0000-0000-000000000000'

    const { error } = await supabase.from('bookings').insert({
      id: bookingId,
      customer_id: customerId,
      service_category: args.category || 'plumbing',
      lat: 33.7294,
      lng: 73.0561,
      address: args.address || (typeof window !== 'undefined' ? (localStorage.getItem('ustad_user_area') || 'Islamabad') : 'Islamabad'),
      status: 'pending',
      search_radius_km: 1.5,
      description: args.description || 'AI Drafted Booking',
      price_estimate_min: args.minPrice || 200,
      price_estimate_max: args.maxPrice || 3500,
      price: args.minPrice ? Math.floor((args.minPrice + args.maxPrice) / 2) : (args.maxPrice || 500)
    })

    if (error) {
      console.error('Failed creating booking from widget:', error)
      alert('Error creating booking: ' + error.message)
      return
    }

    setIsOpen(false)
    router.push(`/booking/instant?category=${args.category || 'plumbing'}&bookingId=${bookingId}`)
  }

  const handleEditDraftBooking = (args: any) => {
    setIsOpen(false)
    router.push(`/booking/new?category=${args.category || 'plumbing'}&desc=${encodeURIComponent(args.description || '')}`)
  }

  const clearWidgetChat = () => {
    const intro: Message = {
      id: 'welcome',
      role: 'assistant',
      content: locale === 'ur'
        ? 'گفتگو کی ہسٹری صاف کر دی گئی ہے۔ میں کیا مدد کروں؟'
        : 'Chat history cleared. What can I help you with?',
    }
    setMessages([intro])
    sessionStorage.removeItem('ustad_floating_chat_history')
  }

  const suggestionChips = [
    { text: locale === 'ur' ? 'پلمبر ریٹ' : 'Plumber rate?', value: 'How much for a leaking tap?' },
    { text: locale === 'ur' ? 'اے سی ریپیئر' : 'AC repair rate?', value: 'How much for AC repair?' },
    { text: locale === 'ur' ? 'ٹیکنیشن تلاش کریں' : 'Find technician', value: 'Check plumber availability nearby' },
  ]

  return (
    <div
      ref={widgetRef}
      className="fixed bottom-20 sm:bottom-6 left-4 md:left-[272px] z-50 flex flex-col items-start select-none font-sans"
    >
      {/* 1. SPEECH BUBBLE (Above Icon) */}
      {showSpeechBubble && !isOpen && (
        <div className="absolute -top-12 left-0 mb-2 z-50 animate-speech-bubble pointer-events-none">
          <div className="relative bg-card text-foreground text-xs font-bold px-3 py-1.5 rounded-2xl shadow-lg border border-border flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-primary">✨</span>
            <span>{speechBubbleText}</span>
            <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-card border-r border-b border-border rotate-45" />
          </div>
        </div>
      )}

      {/* 2. HOVERING CHAT WINDOW (Opens above icon) */}
      {isOpen && (
        <div className="fixed bottom-24 left-4 sm:left-6 md:left-[272px] z-50 w-[calc(100vw-32px)] sm:w-[380px] h-[520px] max-h-[75vh] sm:max-h-[560px] bg-card rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200">
          {/* Header */}
          <div className="bg-muted/80 backdrop-blur-md px-3.5 py-2.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Cute pixel animal avatar in header */}
              <div className="relative size-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center p-1 overflow-hidden shrink-0">
                <img
                  src={avatarSrc}
                  alt="USTAD AI Avatar"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-foreground">USTAD AI Assistant</h3>
                  <span className="flex size-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Instant support & rate estimates</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearWidgetChat}
                title="Clear chat"
                className="tap p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-background transition-colors"
              >
                <Trash2 className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="tap p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-1 max-w-[88%] animate-in fade-in duration-150",
                    isUser ? "self-end items-end" : "self-start items-start"
                  )}
                >
                  {msg.content && (
                    <div
                      className={cn(
                        "p-3 text-xs leading-relaxed font-medium shadow-sm",
                        isUser
                          ? "rounded-2xl rounded-tr-none bg-primary text-primary-foreground"
                          : "rounded-2xl rounded-tl-none bg-muted text-foreground"
                      )}
                    >
                      {msg.content}
                    </div>
                  )}

                  {/* Tool Call Cards */}
                  {msg.toolCall && (
                    <div className="w-full mt-1">
                      {/* Price Estimate Card */}
                      {msg.toolCall.name === 'get_price_estimate' && (
                        <Card className="border-border shadow-sm bg-card">
                          <CardContent className="p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                {categoryIcons[msg.toolCall.args.category] ? (
                                  (() => {
                                    const Icon = categoryIcons[msg.toolCall.args.category]
                                    return <Icon className="size-3.5" />
                                  })()
                                ) : <Wrench className="size-3.5" />}
                              </span>
                              <span className="text-xs font-bold capitalize text-foreground truncate">
                                {msg.toolCall.args.issue_name || `${msg.toolCall.args.category} Estimate`}
                              </span>
                            </div>
                            <div className="flex flex-col border-t border-b border-border/40 py-1.5">
                              <span className="text-[10px] text-muted-foreground">
                                {msg.toolCall.args.unit ? `Estimated Range (${msg.toolCall.args.unit})` : 'Estimated Range'}
                              </span>
                              <span className="text-sm font-bold text-foreground font-mono mt-0.5">
                                {formatPKR(msg.toolCall.args.minPrice)} – {formatPKR(msg.toolCall.args.maxPrice)}
                              </span>
                            </div>
                            <div className="flex gap-1 items-start text-[10px] text-muted-foreground">
                              <Info className="size-3 text-primary shrink-0 mt-0.5" />
                              <p>Final price confirmed by technician before work.</p>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Draft Booking Card */}
                      {msg.toolCall.name === 'draft_booking' && (
                        <Card className="border-primary/30 shadow-sm bg-card border-2">
                          <CardContent className="p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Sparkles className="size-3.5 text-primary animate-pulse" />
                                <span className="text-xs font-bold text-primary">Booking Draft</span>
                              </div>
                              <span className="text-[10px] font-bold bg-[#EAF1FE] text-primary px-1.5 py-0.5 rounded capitalize">
                                {msg.toolCall.args.category}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1 text-[11px]">
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Details:</span>
                                <span className="font-semibold text-foreground truncate max-w-[160px]">{msg.toolCall.args.description}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-semibold text-foreground truncate max-w-[160px]">{msg.toolCall.args.address}</span>
                              </div>
                              <div className="flex justify-between gap-2 border-t border-border/40 pt-1">
                                <span className="text-muted-foreground font-bold">Price Range:</span>
                                <span className="font-bold text-foreground font-mono">
                                  {formatPKR(msg.toolCall.args.minPrice)} – {formatPKR(msg.toolCall.args.maxPrice)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 mt-1 border-t border-border/40 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="tap h-7 bg-transparent text-[10px] font-bold px-1"
                                onClick={() => handleEditDraftBooking(msg.toolCall?.args)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                className="tap h-7 font-bold text-[10px] px-1"
                                onClick={() => handleConfirmDraftBooking(msg.toolCall?.args)}
                              >
                                Confirm
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Customer Service History Card */}
                      {msg.toolCall.name === 'get_customer_service_history' && (
                        <Card className="border-border shadow-sm bg-card">
                          <CardContent className="p-3 flex flex-col gap-1.5 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-foreground">
                              <FileText className="size-3.5 text-primary" />
                              Recent Booking
                            </div>
                            <div className="flex flex-col gap-1 text-[11px] border-t border-b border-border/40 py-1.5">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Technician</span>
                                <span className="font-bold text-foreground">{msg.toolCall.args.lastTechnician}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Job ID</span>
                                <span className="font-mono text-foreground">{msg.toolCall.args.lastJobId}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              className="tap w-full h-7 text-[10px] font-bold mt-0.5"
                              onClick={() => handleConfirmDraftBooking({ category: msg.toolCall?.args.lastCategory })}
                            >
                              <RotateCcw className="size-3 mr-1" />
                              Book Again
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Availability Card */}
                      {msg.toolCall.name === 'check_technician_availability' && (
                        <Card className="border-success/30 bg-success/5 shadow-sm">
                          <CardContent className="p-2.5 flex flex-col gap-1.5 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-success">
                              <User className="size-3.5 text-success" />
                              Technicians Online
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              <span className="font-bold text-foreground">{msg.toolCall.args.onlineCount} technicians</span> online nearby. Wait time ~<span className="font-bold text-foreground">{msg.toolCall.args.typicalWaitMinutes} min</span>.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {loading && (
              <div className="p-2.5 bg-muted rounded-2xl rounded-tl-none w-14 flex items-center justify-center gap-1 animate-pulse">
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length < 3 && (
            <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip.value)}
                  className="tap rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground whitespace-nowrap"
                >
                  {chip.text}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend(input)
            }}
            className="p-2.5 border-t border-border bg-background flex items-center gap-1.5 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask for price, availability..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 h-9 px-3 rounded-xl border border-border bg-muted text-xs text-foreground outline-none focus:border-primary/40"
            />
            <Button
              type="submit"
              size="icon"
              className="tap size-9 bg-primary hover:bg-primary/95 text-white shrink-0"
              disabled={!input.trim() || loading}
            >
              <Send className="size-3.5" />
            </Button>
          </form>
        </div>
      )}

      {/* 3. FLOATING CHAT AVATAR BUTTON (Dashboard Left Side) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{ width: `${ICON_SIZE_PX}px`, height: `${ICON_SIZE_PX}px` }}
        className={cn(
          "tap relative rounded-full bg-card border-2 border-primary/30 shadow-xl flex items-center justify-center p-1.5 overflow-hidden transition-transform duration-200 hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-primary/40",
          !isOpen && "animate-float-idle"
        )}
        aria-label="Open AI Assistant Chat"
        title="Open USTAD AI Assistant"
      >
        {/* Soft radial aura glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/10 via-transparent to-primary/20 pointer-events-none" />

        {/* Cute Pixel Animal Avatar Image */}
        <img
          src={avatarSrc}
          alt="USTAD AI Assistant Avatar"
          className="w-full h-full object-contain pointer-events-none transition-transform duration-200 group-hover:scale-110"
        />

        {/* Online Indicator Badge */}
        <span className="absolute bottom-0.5 right-0.5 flex size-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full size-3 bg-success border-2 border-card" />
        </span>
      </button>
    </div>
  )
}
