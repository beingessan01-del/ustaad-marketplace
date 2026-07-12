'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Wrench,
  Zap,
  Cog,
  PaintRoller,
  SprayCan,
  Hammer,
  Sparkles,
  Info,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ThumbsUp,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from '@/lib/i18n'
import {
  getDbTable,
  insertDbRow,
  type JobRequest,
} from '@/lib/storage-sync'
import { serviceCategories, formatPKR } from '@/lib/data'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCall?: {
    name: string
    args: any
  }
}

export default function ChatPage() {
  const router = useRouter()
  const { t, locale, isRtl } = useTranslation()

  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [rateLimitCount, setRateLimitCount] = useState(0)
  const [showLimitWarning, setShowLimitWarning] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Map category IDs to Icons
  const categoryIcons: Record<string, any> = {
    plumbing: Wrench,
    electrical: Zap,
    mechanic: Cog,
    painting: PaintRoller,
    cleaning: SprayCan,
    carpentry: Hammer,
  }

  // Populate initial context and history on mount
  useEffect(() => {
    // 1. Check rate limits
    const today = new Date().toDateString()
    const storedLimitDay = localStorage.getItem('ustad_chat_limit_day')
    let count = 0

    if (storedLimitDay === today) {
      count = Number(localStorage.getItem('ustad_chat_limit_count') || '0')
    } else {
      localStorage.setItem('ustad_chat_limit_day', today)
      localStorage.setItem('ustad_chat_limit_count', '0')
    }
    setRateLimitCount(count)
    if (count >= 30) {
      setShowLimitWarning(true)
    }

    // 2. Load prior conversation context
    const storedMessages = localStorage.getItem('ustad_chat_history')
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages))
    } else {
      // Intro greetings
      const defaultGreeting: Message = {
        id: 'welcome',
        role: 'assistant',
        content: locale === 'ur' 
          ? 'السلام علیکم! میں استاد کا لائیو چیٹ اسسٹنٹ ہوں۔ میں آپ کی بکنگ، قیمتوں کے اندازے اور قریبی ٹیکنیشنز تلاش کرنے میں مدد کر سکتا ہوں۔ میں آج آپ کی کیا مدد کروں؟'
          : 'Asalam-o-Alaikum! I am the USTAD AI Assistant. I can help you check service prices, find available technicians, or prepare a booking card. What can I do for you today?',
      }
      setMessages([defaultGreeting])
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Save history to localStorage
  const saveChatHistory = (updated: Message[]) => {
    localStorage.setItem('ustad_chat_history', JSON.stringify(updated.slice(-20))) // limit window to 20 messages
  }

  const handleSend = async (textToSend: string) => {
    const trimmed = textToSend.trim()
    if (!trimmed) return

    // Check rate limit count
    if (rateLimitCount >= 30) {
      setShowLimitWarning(true)
      return
    }

    // Update count in state and storage
    const newCount = rateLimitCount + 1
    setRateLimitCount(newCount)
    localStorage.setItem('ustad_chat_limit_count', String(newCount))

    const userMsg: Message = {
      id: 'msg_' + Math.random(),
      role: 'user',
      content: trimmed,
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    saveChatHistory(updatedMessages)
    setInput('')
    setLoading(true)

    // Setup streaming placeholder
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
          
          // Check for tool call trigger marker
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

          // Update typing placeholder dynamically
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: assistantText.trim() }
                : m
            )
          )
        }

        // Apply tool calls parsed at end of stream
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
            console.error('Failed parsing streamed tool call:', e)
          }
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: locale === 'ur' ? 'معذرت، میں فی الحال سرور سے رابطہ نہیں کر پا رہا ہوں۔ برائے مہربانی بعد میں کوشش کریں۔' : 'Apologies, I am currently unable to reach the chat server. Please check your connection and try again.' }
            : m
        )
      )
    } finally {
      setLoading(false)
      // Save final updated list
      setMessages((prev) => {
        saveChatHistory(prev)
        return prev
      })
    }
  }

  // Tapping Confirm & Request hands off to existing dispatch matching flow
  const handleConfirmDraftBooking = (args: any) => {
    const requestId = 'REQ-' + Math.floor(100000 + Math.random() * 900000)
    const newRequest: JobRequest = {
      id: requestId,
      customer_id: 'CUST-1',
      service_category: args.category || 'plumbing',
      lat: 33.7294,
      lng: 73.0561,
      address: args.address || 'House 42, Street 18, F-7/2, Islamabad',
      status: 'searching',
      created_at: Date.now(),
      matched_technician_id: null,
      search_radius_km: 1.5,
    }

    insertDbRow('job_requests', newRequest)
    // Go directly to live tracking matching page
    router.push(`/booking/instant?category=${args.category || 'plumbing'}`)
  }

  const handleEditDraftBooking = (args: any) => {
    // Route to manual booking page pre-filled
    router.push(`/booking/new?category=${args.category || 'plumbing'}&desc=${encodeURIComponent(args.description || '')}`)
  }

  const clearChatHistory = () => {
    if (confirm(locale === 'ur' ? 'کیا آپ گفتگو کی ہسٹری صاف کرنا چاہتے ہیں؟' : 'Are you sure you want to clear the chat history?')) {
      localStorage.removeItem('ustad_chat_history')
      const intro: Message = {
        id: 'welcome',
        role: 'assistant',
        content: locale === 'ur' 
          ? 'السلام علیکم! گفتگو کی ہسٹری صاف کر دی گئی ہے۔ میں آج آپ کی کیا مدد کروں؟'
          : 'Asalam-o-Alaikum! Chat history cleared. What can I do for you today?',
      }
      setMessages([intro])
    }
  }

  // Suggestion Intent Chips
  const suggestionChips = [
    { text: locale === 'ur' ? 'ابھی پلمبر بلائیں' : 'Book a plumber now', value: 'Book a plumber right now' },
    { text: locale === 'ur' ? 'اے سی ریپیئر ریٹس' : 'AC repair rates?', value: 'How much for AC repair?' },
    { text: locale === 'ur' ? 'پچھلا جاب دکھائیں' : 'Show last booking', value: 'Show my last booking history' },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-background pb-5">
      {/* Header bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="tap p-2 -ml-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5 rtl-mirror" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-foreground">USTAD AI Assistant</h1>
            <span className="flex size-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">Active support • streams live</p>
        </div>
        <button
          onClick={clearChatHistory}
          className="tap text-[10px] text-muted-foreground/60 hover:text-destructive underline p-1 rounded font-medium"
        >
          Clear History
        </button>
      </header>

      {/* Warning Rate Limit banners */}
      {showLimitWarning && (
        <div className="bg-warning/10 border-b border-warning/20 p-3 flex gap-2.5 items-start text-xs text-warning-foreground">
          <AlertTriangle className="size-4.5 text-warning shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Rate Limit Warning:</span> You have reached 30 messages limit for today. We rate-limit AI usage to keep operations cost-friendly. Try again tomorrow.
          </div>
        </div>
      )}

      {/* Scrollable messages container */}
      <main className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 max-w-xl mx-auto w-full">
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-1.5 max-w-[85%] animate-in fade-in duration-200",
                isUser ? "self-end items-end" : "self-start items-start"
              )}
            >
              {/* Message bubble */}
              {msg.content && (
                <div
                  className={cn(
                    "p-3.5 text-xs leading-relaxed soft-shadow font-medium",
                    isUser
                      ? "rounded-2xl rounded-tr-none bg-primary text-primary-foreground"
                      : "rounded-2xl rounded-tl-none bg-[#F5F6F8] text-foreground"
                  )}
                >
                  {msg.content}
                </div>
              )}

              {/* Dynamic tools card renderer */}
              {msg.toolCall && (
                <div className="w-full mt-1 animate-in zoom-in-95 duration-200">
                  {/* Tool 1: Price Estimate Card */}
                  {msg.toolCall.name === 'get_price_estimate' && (
                    <Card className="border-border soft-shadow bg-card">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            {categoryIcons[msg.toolCall.args.category] ? (
                              (() => {
                                const Icon = categoryIcons[msg.toolCall.args.category]
                                return <Icon className="size-4" />
                              })()
                            ) : <Wrench className="size-4" />}
                          </span>
                          <span className="text-xs font-bold capitalize text-foreground">
                            {msg.toolCall.args.category} Rate Estimate
                          </span>
                        </div>
                        <div className="flex flex-col border-t border-b border-border/40 py-2">
                          <span className="text-[10px] text-muted-foreground">Estimated Range</span>
                          <span className="text-base font-bold text-foreground font-mono mt-0.5">
                            {formatPKR(msg.toolCall.args.minPrice)} – {formatPKR(msg.toolCall.args.maxPrice)}
                          </span>
                        </div>
                        <div className="flex gap-1.5 items-start text-[10px] text-muted-foreground leading-normal">
                          <Info className="size-3 text-primary shrink-0 mt-0.5" />
                          <p>final price confirmed by technician's quote before work begins.</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tool 2: Booking Draft Card */}
                  {msg.toolCall.name === 'draft_booking' && (
                    <Card className="border-primary/20 soft-shadow bg-card border-2">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="size-4 text-primary animate-pulse" />
                            <span className="text-xs font-bold text-primary">Booking Draft Form</span>
                          </div>
                          <span className="text-[10px] font-bold bg-[#EAF1FE] text-primary px-2 py-0.5 rounded capitalize">
                            {msg.toolCall.args.category}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 text-xs">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Details:</span>
                            <span className="font-semibold text-foreground truncate max-w-[200px]">{msg.toolCall.args.description}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Address:</span>
                            <span className="font-semibold text-foreground truncate max-w-[200px]">{msg.toolCall.args.address}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">Time Slot:</span>
                            <span className="font-semibold text-foreground">{msg.toolCall.args.preferred_time}</span>
                          </div>
                          <div className="flex justify-between gap-2 border-t border-border/40 pt-2">
                            <span className="text-muted-foreground font-bold">Estimated Price:</span>
                            <span className="font-bold text-foreground font-mono">
                              {formatPKR(msg.toolCall.args.minPrice)} – {formatPKR(msg.toolCall.args.maxPrice)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2 border-t border-border/40 pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="tap h-9 bg-transparent border-border text-xs font-bold"
                            onClick={() => handleEditDraftBooking(msg.toolCall?.args)}
                          >
                            Edit Manually
                          </Button>
                          <Button
                            size="sm"
                            className="tap h-9 font-bold text-xs"
                            onClick={() => handleConfirmDraftBooking(msg.toolCall?.args)}
                          >
                            Confirm & Request
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tool 3: Service History Response */}
                  {msg.toolCall.name === 'get_customer_service_history' && (
                    <Card className="border-border soft-shadow bg-card">
                      <CardContent className="p-4 flex flex-col gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <FileText className="size-4.5 text-primary" />
                          Recent Completed Booking
                        </div>
                        <div className="flex flex-col gap-1.5 text-xs border-t border-b border-border/40 py-2">
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
                          className="tap w-full h-9 font-bold"
                          onClick={() => handleConfirmDraftBooking({ category: msg.toolCall?.args.lastCategory })}
                        >
                          <RotateCcw className="size-3.5 mr-1.5" />
                          Book Usman Khan Again
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tool 4: Availability Card */}
                  {msg.toolCall.name === 'check_technician_availability' && (
                    <Card className="border-success/20 bg-success/5 soft-shadow">
                      <CardContent className="p-4 flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-success">
                          <User className="size-4 text-success" />
                          Technicians Online
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-normal">
                          There are currently <span className="font-bold text-foreground">{msg.toolCall.args.onlineCount} online plumbers</span> nearby. 
                          Average wait time is <span className="font-bold text-foreground">{msg.toolCall.args.typicalWaitMinutes} minutes</span>.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* typing loading indicator dots */}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div className="flex flex-col gap-1 max-w-[85%] self-start items-start animate-in fade-in duration-200">
            <div className="p-3 bg-[#F5F6F8] rounded-2xl rounded-tl-none flex items-center gap-1.5">
              <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="size-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Input area */}
      <footer className="sticky bottom-0 z-40 border-t border-border bg-background px-4 py-3 max-w-xl mx-auto w-full flex flex-col gap-3">
        {/* Suggestion Chips */}
        {messages.length < 4 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {suggestionChips.map((chip, index) => (
              <button
                key={index}
                onClick={() => handleSend(chip.value)}
                className="tap rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap text-[#6F767E] hover:bg-muted hover:text-foreground"
              >
                {chip.text}
              </button>
            ))}
          </div>
        )}

        {/* Send message text box */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend(input)
          }}
          className="flex items-center gap-2"
        >
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-border bg-muted px-3 focus-within:bg-background focus-within:border-primary/40 transition-colors">
            <input
              type="text"
              placeholder="Ask about pricing, or say what you need fixed..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || rateLimitCount >= 30}
              className="h-11 w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Button
            type="submit"
            size="icon-lg"
            className="tap size-11 shrink-0 bg-primary hover:bg-primary/95 text-white"
            disabled={!input.trim() || loading || rateLimitCount >= 30}
            aria-label="Send message"
          >
            <Send className="size-4.5 rtl-mirror" />
          </Button>
        </form>
      </footer>
    </div>
  )
}
