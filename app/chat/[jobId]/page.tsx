'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Send, MessageSquare, ShieldCheck, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppTopbar } from '@/components/ustad/app-topbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export default function ChatRoomPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const jobId = params?.jobId as string

  const [userId, setUserId] = useState<string | null>(null)
  const [otherName, setOtherName] = useState('Partner')
  const [booking, setBooking] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // 1. Initial Load & Auth check
  useEffect(() => {
    if (!jobId) return

    async function loadChatInfo() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)

      // Fetch booking details & linked users
      const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', jobId)
        .single()

      if (!b) {
        setLoading(false)
        return
      }
      setBooking(b)

      // Fetch other participant's profile name
      const otherId = user.id === b.customer_id ? b.technician_id : b.customer_id
      if (otherId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', otherId)
          .single()
        if (prof) {
          setOtherName(prof.full_name)
        }
      } else {
        setOtherName('Awaiting Partner')
      }

      // Fetch previous messages in this thread
      const { data: msgs } = await supabase
        .from('job_messages')
        .select('*')
        .eq('job_request_id', jobId)
        .order('created_at', { ascending: true })

      if (msgs) {
        setMessages(msgs)
      }
      setLoading(false)
    }

    loadChatInfo()
  }, [jobId])

  // 2. Realtime Messages Listener
  useEffect(() => {
    if (!jobId) return

    const channel = supabase
      .channel(`job_chat:${jobId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_messages', filter: `job_request_id=eq.${jobId}` },
        (payload) => {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === payload.new.id)
            if (exists) return prev
            return [...prev, payload.new]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [jobId])

  // 3. Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 4. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !userId || !jobId || sending) return
    setSending(true)

    const msgContent = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase.from('job_messages').insert({
      job_request_id: jobId,
      sender_id: userId,
      content: msgContent,
    })

    if (error) {
      alert('Message failed to send: ' + error.message)
      setNewMessage(msgContent) // Restore input on failure
    }
    setSending(false)
  }

  const isReadOnly = booking?.status === 'completed' || booking?.status === 'cancelled'

  return (
    <div className="flex h-svh flex-col bg-background">
      <AppTopbar />

      {/* Chat header area */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 shadow-xs">
        <button
          onClick={() => router.back()}
          className="tap flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <h1 className="text-sm font-bold text-foreground truncate">{otherName}</h1>
          <p className="text-[10px] text-muted-foreground capitalize font-semibold flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
            {booking?.service_category} Service • Status: {booking?.status}
          </p>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3.5 bg-muted/10">
        {loading ? (
          <div className="text-center text-xs text-muted-foreground/60 py-10">Loading messages...</div>
        ) : messages.length > 0 ? (
          messages.map((msg) => {
            const isSelf = msg.sender_id === userId
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1 max-w-[75%]",
                  isSelf ? "self-end items-end" : "self-start items-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-2xl p-3.5 text-xs leading-normal shadow-2xs font-medium",
                    isSelf 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-card border border-border text-foreground rounded-tl-none"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-muted-foreground/50 px-1 font-semibold font-mono">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-3 text-muted-foreground/55">
            <MessageSquare className="size-10 text-muted-foreground/30" />
            <p className="text-xs italic">Start the conversation! Type a message below.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel */}
      <div className="border-t border-border bg-card p-4">
        {isReadOnly ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 text-[11px] text-muted-foreground justify-center border border-border/40">
            <AlertCircle className="size-4 shrink-0 text-muted-foreground/80" />
            <span>This conversation is read-only because the job is completed or cancelled.</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type message here..."
              disabled={loading || sending}
              className="flex-1 h-12 rounded-xl border border-border bg-muted px-4 text-xs text-foreground outline-none focus:border-primary focus:bg-background placeholder:text-muted-foreground"
            />
            <Button
              type="submit"
              size="icon-lg"
              disabled={!newMessage.trim() || loading || sending}
              className="tap size-12 shrink-0 bg-primary hover:bg-primary/95 text-white"
            >
              <Send className="size-4.5" />
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
