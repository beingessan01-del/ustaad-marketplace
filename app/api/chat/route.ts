import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// System instructions for Ustad Chat Assistant
const SYSTEM_PROMPT = `
You are the USTAD AI Chat Assistant, a friendly and knowledgeable conversational assistant for the USTAD home services marketplace in Pakistan (Islamabad & Rawalpindi).

YOUR GOAL:
1. Answer customer questions conversationally, helpfully, and accurately about home services, DIY troubleshooting tips, pricing, coverage areas, and platform features.
2. ONLY call tools when specifically requested or relevant:
   - Call 'get_price_estimate' when the user asks about prices or rates.
   - Call 'check_technician_availability' when the user asks if technicians are available or wait times.
   - Call 'draft_booking' ONLY when the user explicitly asks to book, hire, or request a technician.
   - Call 'get_customer_service_history' when the user asks about past orders or booking history.

GUIDELINES:
- For general questions (e.g., greetings, how the platform works, payment info, DIY repair advice, coverage areas), respond with clear, friendly text without creating draft booking cards.
- Keep replies concise, helpful, and natural (2 to 4 sentences).
- Always respond in the language used by the user (English or Urdu).
`

// Tool definitions for Claude
const TOOLS = [
  {
    name: 'get_price_estimate',
    description: 'Retrieve the rate-card estimate range for a specific issue or service category.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['plumbing', 'electrical', 'mechanic', 'painting', 'cleaning', 'carpentry'] },
        issue_description: { type: 'string', description: 'Free-text description of the user issue or problem (e.g. "leaking tap", "AC nahi thanda ho raha", "wall repaint")' },
        description: { type: 'string', description: 'Quick description of the problem' },
        area: { type: 'string', description: 'Sector or neighborhood name, e.g. F-7' }
      },
      required: ['category']
    }
  },
  {
    name: 'check_technician_availability',
    description: 'Check online technicians count and average wait times in an area.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['plumbing', 'electrical', 'mechanic', 'painting', 'cleaning', 'carpentry'] },
        area: { type: 'string' },
        preferred_time: { type: 'string' }
      },
      required: ['category']
    }
  },
  {
    name: 'draft_booking',
    description: 'Pre-fill a booking request card for customer review.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['plumbing', 'electrical', 'mechanic', 'painting', 'cleaning', 'carpentry'] },
        description: { type: 'string' },
        address: { type: 'string' },
        preferred_time: { type: 'string', description: 'Time or date string, or "now"' },
        urgency: { type: 'string', enum: ['now', 'scheduled'] }
      },
      required: ['category', 'description']
    }
  },
  {
    name: 'get_customer_service_history',
    description: 'View the customer recent completed/cancelled services list.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
]

// Query Supabase issue_price_list and perform issue-level price estimate matching
async function fetchIssuePriceEstimate(category: string, issueDescription: string) {
  const fallbackRates: Record<string, { min: number; max: number; unit?: string }> = {
    plumbing: { min: 800, max: 1500, unit: 'per job' },
    electrical: { min: 600, max: 1200, unit: 'per job' },
    mechanic: { min: 1000, max: 2500, unit: 'per job' },
    painting: { min: 1500, max: 4500, unit: 'per job' },
    cleaning: { min: 1200, max: 3000, unit: 'per job' },
    carpentry: { min: 900, max: 2000, unit: 'per job' },
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pebbjenmssvavvvdiqlq.supabase.co'
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlYmJqZW5tc3N2YXZ2dmRpcWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NTgxNDcsImV4cCI6MjA5OTMzNDE0N30.5_6tbEmm9ovtBrrQ9cBp6_d71fhQ93OnYd59YzeWSWM'

    const res = await fetch(`${supabaseUrl}/rest/v1/issue_price_list?select=*`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      next: { revalidate: 3600 }
    })

    if (res.ok) {
      const issueList: Array<{
        id: string
        issue_name: string
        category: string
        price_min: number
        price_max: number
        unit: string
      }> = await res.json()

      const textToMatch = (issueDescription || '').toLowerCase().trim()

      if (textToMatch && issueList.length > 0) {
        let bestMatch: typeof issueList[0] | null = null
        let maxScore = 0

        for (const item of issueList) {
          let score = 0
          const itemIssue = item.issue_name.toLowerCase()
          const itemCat = item.category.toLowerCase()

          if (category && itemCat === category.toLowerCase()) {
            score += 1
          }

          const words = textToMatch.split(/\s+/)
          for (const word of words) {
            if (word.length < 3 && word !== 'ac' && word !== 'tv') continue
            if (itemIssue.includes(word)) {
              score += 3
            }
          }

          // Specific Roman Urdu / Casual English rules
          if ((textToMatch.includes('tap') || textToMatch.includes('nalki')) && itemIssue.includes('tap')) {
            if (textToMatch.includes('leak') || textToMatch.includes('small') || textToMatch.includes('change')) {
              if (itemIssue.includes('small tap')) score += 10
            } else if (itemIssue.includes('mixer') || itemIssue.includes('repair')) {
              score += 8
            } else {
              score += 6
            }
          }

          if ((textToMatch.includes('ac') || textToMatch.includes('a/c')) && itemCat === 'mechanic') {
            if (textToMatch.includes('thanda') || textToMatch.includes('cool') || textToMatch.includes('cooling') || textToMatch.includes('nahi')) {
              if (itemIssue.includes('ac not cooling')) score += 12
            } else if (textToMatch.includes('gas') || textToMatch.includes('filling')) {
              if (itemIssue.includes('gas refilling')) score += 12
            } else if (textToMatch.includes('clean') || textToMatch.includes('service')) {
              if (itemIssue.includes('cleaning')) score += 12
            } else if (textToMatch.includes('install')) {
              if (itemIssue.includes('installation')) score += 12
            } else {
              if (itemIssue.includes('ac not cooling')) score += 5
            }
          }

          if ((textToMatch.includes('drain') || textToMatch.includes('clog') || textToMatch.includes('band')) && itemIssue.includes('drain')) {
            if (textToMatch.includes('sink') || textToMatch.includes('basin')) {
              if (itemIssue.includes('sink')) score += 10
            } else {
              if (itemIssue.includes('toilet')) score += 8
            }
          }

          if ((textToMatch.includes('breaker') || textToMatch.includes('fuse')) && itemIssue.includes('breaker')) {
            score += 10
          }

          if (score > maxScore && score >= 4) {
            maxScore = score
            bestMatch = item
          }
        }

        if (bestMatch) {
          return {
            category: bestMatch.category,
            minPrice: bestMatch.price_min,
            maxPrice: bestMatch.price_max,
            unit: bestMatch.unit || 'per job',
            issue_name: bestMatch.issue_name,
            isSpecificMatch: true
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching issue_price_list:', err)
  }

  const fallback = fallbackRates[category] || fallbackRates.plumbing
  return {
    category,
    minPrice: fallback.min,
    maxPrice: fallback.max,
    unit: fallback.unit || 'per job',
    issue_name: `${category ? category.charAt(0).toUpperCase() + category.slice(1) : 'Standard'} Rate Estimate`,
    isSpecificMatch: false
  }
}

export async function POST(req: Request) {
  try {
    const { messages, locale } = await req.json()
    const lastUserMessage = messages[messages.length - 1]?.content || ''

    const groqApiKey = process.env.GROQ_API_KEY
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY

    // 1. If Groq API Key is configured, use Llama 3.1
    if (groqApiKey) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT + `
If you decide to invoke a tool, append the following marker text at the end of your response:
__TOOL_CALL__:{"name": "tool_name", "args": { ... }}

Available tools:
1. name: "get_price_estimate", args: { category: "plumbing" | "electrical" | "mechanic" | "painting" | "cleaning" | "carpentry", description?: string }
2. name: "check_technician_availability", args: { category: "plumbing" | "electrical" | "mechanic" | "painting" | "cleaning" | "carpentry" }
3. name: "draft_booking", args: { category: "plumbing" | "electrical" | "mechanic" | "painting" | "cleaning" | "carpentry", description: string, address?: string }
4. name: "get_customer_service_history", args: {}
` },
            ...messages.map((m: any) => ({ role: m.role, content: m.content }))
          ],
          max_tokens: 1024,
          temperature: 0.7,
          stream: true
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`Error from Groq API (Status ${response.status}): ${errText}`))
            controller.close()
          }
        })
        return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }

      // Stream Groq response back to client
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          let buffer = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const cleanLine = line.trim()
              if (cleanLine.startsWith('data:')) {
                const jsonStr = cleanLine.slice(5).trim()
                if (jsonStr === '[DONE]') continue
                try {
                  const data = JSON.parse(jsonStr)
                  const text = data.choices[0]?.delta?.content
                  if (text) {
                    controller.enqueue(encoder.encode(text))
                  }
                } catch (e) {
                  // ignore parse errors
                }
              }
            }
          }
          controller.close()
        }
      })

      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }

    // 2. If Anthropic API Key is configured, use Claude
    if (anthropicApiKey) {
      // Call real Anthropic Messages API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
          tools: TOOLS,
          stream: true
        })
      })

      if (!response.ok) {
        throw new Error('Anthropic API request failed')
      }

      // Stream Claude back to client
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      const stream = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader()
          if (!reader) {
            controller.close()
            return
          }

          let buffer = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.slice(5).trim())
                  
                  // Text chunk
                  if (data.type === 'content_block_delta' && data.delta?.text) {
                    controller.enqueue(encoder.encode(data.delta.text))
                  }
                  
                  // Tool call trigger event
                  if (data.type === 'content_block_start' && data.content_block?.type === 'tool_use') {
                    const toolUse = data.content_block
                    controller.enqueue(encoder.encode(`\n__TOOL_CALL__:${JSON.stringify(toolUse)}`))
                  }
                } catch (e) {
                  // ignore parse errors
                }
              }
            }
          }
          controller.close()
        }
      })

      return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }

    // 3. Intelligent conversational response engine for local simulation
    const encoder = new TextEncoder()
    const query = lastUserMessage.toLowerCase().trim()
    const isUrduQuery = locale === 'ur' || /[\u0600-\u06FF]/.test(lastUserMessage)

    // Determine matching category if relevant
    let matchedCategory = 'plumbing'
    if (query.includes('elect') || query.includes('wire') || query.includes('light') || query.includes('switch') || query.includes('بجلی')) {
      matchedCategory = 'electrical'
    } else if (query.includes('ac') || query.includes('generator') || query.includes('motor') || query.includes('fridge') || query.includes('مکینک')) {
      matchedCategory = 'mechanic'
    } else if (query.includes('paint') || query.includes('wall') || query.includes('color') || query.includes('رنگ')) {
      matchedCategory = 'painting'
    } else if (query.includes('clean') || query.includes('wash') || query.includes('sofa') || query.includes('carpet') || query.includes('سفائی')) {
      matchedCategory = 'cleaning'
    } else if (query.includes('wood') || query.includes('door') || query.includes('carpenter') || query.includes('table') || query.includes('فرنیچر')) {
      matchedCategory = 'carpentry'
    }

    let responseText = ''
    let toolCallPayload: any = null

    // A. Greetings / Conversational Introductions
    if (/^(hi|hello|hey|slam|salam|asalam|آسالم|سلام|ہیلو)/i.test(query) || query === 'hi' || query === 'hello') {
      responseText = isUrduQuery
        ? 'وعلیکم السلام! میں استاد کا AI اسسٹنٹ ہوں۔ آپ ہوم سروسز، ریٹ لسٹ، یا ٹیکنیشن کی معلومات کے بارے میں کچھ بھی پوچھ سکتے ہیں۔ بتائیں میں آپ کی کیا مدد کروں؟'
        : 'Asalam-o-Alaikum! I am the USTAD AI Assistant. I can help you with service rates, DIY maintenance tips, checking technician availability, or booking a verified expert. How can I assist you today?'
    }
    // B. Explicit Booking Requests
    else if (query.includes('book') || query.includes('hire') || query.includes('dispatch') || query.includes('send tech') || query.includes('بکنگ') || query.includes('آرڈر') || query.includes('سروس چاہیے')) {
      if (isUrduQuery) {
        responseText = `میں نے آپ کے لیے ${matchedCategory} سروس کا ڈرافٹ تیار کر دیا ہے۔ آپ نیچے کارڈ میں تفصیلات ریویو کر کے درخواست بھیج سکتے ہیں۔`
      } else {
        responseText = `I have drafted a booking request for your ${matchedCategory} service. You can review the details in the card below and tap "Confirm & Request".`
      }

      const rates: Record<string, { min: number; max: number }> = {
        plumbing: { min: 800, max: 1500 },
        electrical: { min: 600, max: 1200 },
        mechanic: { min: 1000, max: 2500 },
        painting: { min: 1500, max: 4500 },
        cleaning: { min: 1200, max: 3000 },
        carpentry: { min: 900, max: 2000 },
      }
      const rate = rates[matchedCategory] || rates.plumbing

      toolCallPayload = {
        name: 'draft_booking',
        args: {
          category: matchedCategory,
          description: lastUserMessage,
          address: 'House 42, Street 18, F-7/2, Islamabad',
          preferred_time: 'As soon as possible',
          urgency: 'now',
          minPrice: rate.min,
          maxPrice: rate.max
        }
      }
    }
    // C. Price & Rate Queries
    else if (query.includes('price') || query.includes('cost') || query.includes('rate') || query.includes('fee') || query.includes('how much') || query.includes('قیمت') || query.includes('ریٹ')) {
      const estimateResult = await fetchIssuePriceEstimate(matchedCategory, lastUserMessage)

      if (isUrduQuery) {
        responseText = estimateResult.isSpecificMatch
          ? `ہماری ریٹ لسٹ کے مطابق "${estimateResult.issue_name}" کی تخمینی قیمت نیچے دیکھیں۔`
          : `ہماری ریٹ لسٹ کے مطابق ${matchedCategory} کی سروس کی تخمینی رینج نیچے دیکھیں۔ حتمی معائنہ فی بمطابق ریٹنگ زیادہ سے زیادہ Rs. 300 ہے۔`
      } else {
        responseText = estimateResult.isSpecificMatch
          ? `Based on our price list, here is the estimate for "${estimateResult.issue_name}". Please check the card below.`
          : `Here is the general rate estimate range for ${matchedCategory} services. Please check the estimate card below.`
      }

      toolCallPayload = {
        name: 'get_price_estimate',
        args: {
          category: estimateResult.category,
          issue_description: lastUserMessage,
          issue_name: estimateResult.issue_name,
          minPrice: estimateResult.minPrice,
          maxPrice: estimateResult.maxPrice,
          unit: estimateResult.unit,
          isSpecificMatch: estimateResult.isSpecificMatch,
          disclaimer: "final inspection fee confirmed before work begins"
        }
      }
    }
    // D. Availability & Timing
    else if (query.includes('avail') || query.includes('free') || query.includes('wait') || query.includes('timing') || query.includes('دستیاب') || query.includes('ٹیکنیشن')) {
      const availableTechs = matchedCategory === 'plumbing' ? 3 : 2
      if (isUrduQuery) {
        responseText = `اس وقت آپ کے علاقے میں ${matchedCategory} کے ${availableTechs} ٹیکنیشن آن لائن ہیں اور پہنچنے کا اوسطاً وقت 10 سے 15 منٹ ہے۔`
      } else {
        responseText = `Currently, there are ${availableTechs} online ${matchedCategory} technicians near your area with an estimated arrival time of 10-15 minutes.`
      }

      toolCallPayload = {
        name: 'check_technician_availability',
        args: {
          category: matchedCategory,
          onlineCount: availableTechs,
          typicalWaitMinutes: 12
        }
      }
    }
    // E. Booking History
    else if (query.includes('history') || query.includes('past') || query.includes('previous') || query.includes('پچھلا') || query.includes('ہسٹری')) {
      if (isUrduQuery) {
        responseText = `آپ کی حالیہ بکنگ ہسٹری چیک کر لی گئی ہے: آخری آرڈر عثمان خان (پلمبر) کے ساتھ مکمل ہوا تھا۔`
      } else {
        responseText = `I fetched your recent service history. Your last completed job was with Usman Khan (Plumber).`
      }

      toolCallPayload = {
        name: 'get_customer_service_history',
        args: {
          lastTechnician: 'Usman Khan',
          lastCategory: 'plumbing',
          lastJobId: 'JOB-9104'
        }
      }
    }
    // F. Payment Info & How Payment Works
    else if (query.includes('pay') || query.includes('cash') || query.includes('card') || query.includes('پیسے') || query.includes('ادائیگی')) {
      responseText = isUrduQuery
        ? 'استاد پلیٹ فارم پر تمام ادائیگیاں کام مکمل ہونے کے بعد نقد (Cash on Completion) کی جاتی ہیں۔ کوئی آن لائن پیشگی رقم کی ضرورت نہیں ہے۔'
        : 'On USTAD, all payments are made in Cash on Completion after the technician completes the work. No upfront online charge is required.'
    }
    // G. Service Offerings
    else if (query.includes('service') || query.includes('offer') || query.includes('what can you do') || query.includes('سروسز')) {
      responseText = isUrduQuery
        ? 'ہم درج ذیل سروسز فراہم کرتے ہیں: پلمبنگ، الیکٹریکل، اے سی و مکینک، پینٹنگ، ہوم ڈیپ کلیننگ، اور کارپینٹری۔ آپ کسی بھی سروس کا ریٹ یا ٹیکنیشن پوچھ سکتے ہیں۔'
        : 'USTAD offers verified professionals for Plumbing, Electrical, AC & Appliances, Painting, Deep Cleaning, and Carpentry across Islamabad and Rawalpindi.'
    }
    // H. Coverage Area / Location
    else if (query.includes('area') || query.includes('location') || query.includes('city') || query.includes('islamabad') || query.includes('rawalpindi') || query.includes('علاقہ')) {
      responseText = isUrduQuery
        ? 'استاد کی سروسز اسلام آباد (F-6, F-7, F-8, G-8, G-9, G-11, DHA) اور راولپنڈی (بحریا ٹاؤن، صدر) کے تمام علاقوں میں دستیاب ہیں۔'
        : 'USTAD services cover all major sectors in Islamabad (F-6, F-7, F-8, G-8, G-9, G-11, DHA) and Rawalpindi (Bahria Town, Saddar, etc.).'
    }
    // I. DIY Troubleshooting & Repair Tips
    else if (query.includes('leak') || query.includes('clog') || query.includes('fuse') || query.includes('noise') || query.includes('fix') || query.includes('clean') || query.includes('tip') || query.includes('خراب')) {
      if (query.includes('leak') || query.includes('water')) {
        responseText = isUrduQuery
          ? 'اگر پانی لیک ہو رہا ہے تو پہلے مین والو بند کریں اور کنکشن پائپ چیک کریں۔ اگر مسئلہ حل نہ ہو تو پلمبر بک کریں۔'
          : 'For pipe leaks, first turn off the local shutoff valve under the sink or main supply. Check if the hose connector is loose. If needed, I can connect you with an expert plumber.'
      } else if (query.includes('elect') || query.includes('wire') || query.includes('fuse')) {
        responseText = isUrduQuery
          ? 'اگر بجلی چلی گئی ہے تو مین ڈی بی بورڈ میں بریکر چیک کریں۔ اگر بریکر ٹرپ ہوا ہے تو اسے آن کریں۔ محفوظ رہیں۔'
          : 'For electrical issues, first check your main breaker panel (DB box) to see if a trip occurred. Always handle electrical fittings with dry hands.'
      } else {
        responseText = isUrduQuery
          ? 'مسئلہ حل کرنے کے لیے پہلے بنیادی وجہ چیک کریں، اگر ضرورت ہو تو ہم اپنے تصدیق شدہ استاد کو آپ کے گھر بھیج سکتے ہیں۔'
          : 'For troubleshooting, inspect the connections carefully. If you need hands-on assistance, let me know and I can get a verified technician assigned.'
      }
    }
    // J. General Conversational Questions
    else {
      responseText = isUrduQuery
        ? `آپ کا سوال موصول ہو گیا ہے۔ میں استاد کا AI اسسٹنٹ ہوں۔ آپ قیمتوں، ٹیکنیشن کی دستیابی، یا گھر کی سروسز کے بارے میں کچھ بھی پوچھ سکتے ہیں۔`
        : `I am the USTAD AI Assistant. I can help answer questions about our home repair services, rate card estimates, technician availability, or guide you through booking a specialist.`
    }

    const stream = new ReadableStream({
      async start(controller) {
        const tokens = responseText.split(' ')
        for (const token of tokens) {
          controller.enqueue(encoder.encode(token + ' '))
          await new Promise((r) => setTimeout(r, 45)) // simulate realistic typing speed
        }

        if (toolCallPayload) {
          // Send structured tool payload marker
          controller.enqueue(encoder.encode(`\n__TOOL_CALL__:${JSON.stringify(toolCallPayload)}`))
        }

        controller.close()
      }
    })

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (error: any) {
    console.error('Error in chat API route:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
