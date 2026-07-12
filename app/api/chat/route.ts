import { NextResponse } from 'next/server'

// System instructions for Ustad Chat Assistant
const SYSTEM_PROMPT = `
You are the USTAD AI Chat Assistant, a friendly and professional conversational partner for the USTAD home services marketplace in Pakistan (operating in Islamabad/Rawalpindi).
Your goal is to help customers:
1. Estimate prices for services (always present as ranges, e.g., Rs. 800 - 1,500, and include the disclaimer: "final price confirmed by technician's quote before work begins").
2. Check technician availability (roughly how many techs are online, wait times).
3. Draft a booking card (pre-filling details so they can confirm with one tap).
4. Review recent service history.

GUARDRAILS:
- Keep replies very short: 2 to 4 sentences maximum.
- Never say you have charged, booked, or dispatched anyone. Only state that you have "drafted" a request which they can confirm.
- If a request is ambiguous, ask clarifying questions (e.g., "leak" -> ask if it's kitchen sink or toilet pipes, how urgent).
- Respond in the language they write in (English or Urdu).
`

// Tool definitions for Claude
const TOOLS = [
  {
    name: 'get_price_estimate',
    description: 'Retrieve the rate-card estimate range for a service category.',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['plumbing', 'electrical', 'mechanic', 'painting', 'cleaning', 'carpentry'] },
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

export async function POST(req: Request) {
  try {
    const { messages, locale } = await req.json()
    const lastUserMessage = messages[messages.length - 1]?.content || ''

    const apiKey = process.env.ANTHROPIC_API_KEY

    if (apiKey) {
      // Call real Anthropic Messages API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
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

    // fallback simulation if Anthropic API key is not configured
    const encoder = new TextEncoder()
    const query = lastUserMessage.toLowerCase()

    let responseText = ''
    let toolCallPayload: any = null

    // Determine matching category
    let matchedCategory = 'plumbing'
    if (query.includes('elect') || query.includes('wire') || query.includes('light') || query.includes('بجلی')) {
      matchedCategory = 'electrical'
    } else if (query.includes('ac') || query.includes('generator') || query.includes('motor') || query.includes('مکینک')) {
      matchedCategory = 'mechanic'
    } else if (query.includes('paint') || query.includes('wall') || query.includes('رنگ')) {
      matchedCategory = 'painting'
    } else if (query.includes('clean') || query.includes('wash') || query.includes('سفائی')) {
      matchedCategory = 'cleaning'
    } else if (query.includes('wood') || query.includes('door') || query.includes('carpenter') || query.includes('فرنیچر')) {
      matchedCategory = 'carpentry'
    }

    // Urdu Response logic
    const isUrduQuery = locale === 'ur' || /[\u0600-\u06FF]/.test(lastUserMessage)

    if (query.includes('price') || query.includes('how much') || query.includes('rate') || query.includes('قیمت') || query.includes('کرایہ')) {
      // 1. Price estimate tool simulation
      if (isUrduQuery) {
        responseText = `ہماری ریٹ لسٹ کے مطابق، ${matchedCategory} کی سروس کے ریٹس نیچے دیے گئے کارڈ میں دیکھیں۔ یہ ایک عارضی اندازہ ہے، حتمی ریٹ ٹیکنیشن معائنے کے بعد ہی فکس کرے گا۔`
      } else {
        responseText = `Based on our standard rate card, here is the price estimate range for ${matchedCategory} services. Please check the estimate card below.`
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
        name: 'get_price_estimate',
        args: {
          category: matchedCategory,
          minPrice: rate.min,
          maxPrice: rate.max,
          disclaimer: "final price confirmed by technician's quote before work begins"
        }
      }
    } else if (query.includes('avail') || query.includes('free') || query.includes('wait') || query.includes('ٹیکنیشن') || query.includes('دستیاب')) {
      // 2. Availability tool simulation
      const availableTechs = matchedCategory === 'plumbing' ? 2 : 1
      if (isUrduQuery) {
        responseText = `اس وقت آپ کے علاقے میں ${matchedCategory} کے ${availableTechs} ٹیکنیشن آن لائن ہیں۔ ان کا اوسطاً پہنچنے کا وقت تقریباً 10-15 منٹ ہے۔`
      } else {
        responseText = `Currently, there are ${availableTechs} online ${matchedCategory} technicians near your area. The typical wait time is around 10-15 minutes.`
      }

      toolCallPayload = {
        name: 'check_technician_availability',
        args: {
          category: matchedCategory,
          onlineCount: availableTechs,
          typicalWaitMinutes: 12
        }
      }
    } else if (query.includes('history') || query.includes('last') || query.includes('booked') || query.includes('ہسٹری') || query.includes('پچھلا')) {
      // 3. History tool simulation
      if (isUrduQuery) {
        responseText = `میں نے آپ کی سروس ہسٹری چیک کر لی ہے۔ آپ نے حال ہی میں عثمان خان (پلمبر) کے ساتھ بکنگ کی تھی۔ کیا آپ دوبارہ ان کے ساتھ سروس بک کرنا چاہیں گے؟`
      } else {
        responseText = `I checked your recent service history. Your last completed job was with Usman Khan (Plumber). Would you like to book them again?`
      }

      toolCallPayload = {
        name: 'get_customer_service_history',
        args: {
          lastTechnician: 'Usman Khan',
          lastCategory: 'plumbing',
          lastJobId: 'JOB-9104'
        }
      }
    } else {
      // 4. Draft booking tool simulation
      if (isUrduQuery) {
        responseText = `میں نے آپ کے لیے ${matchedCategory} سروس بکنگ کا ایک ڈرافٹ تیار کر لیا ہے۔ براہ کرم نیچے دیے گئے کارڈ میں تفصیلات چیک کریں اور "درخواست بھیجیں" پر کلک کریں۔`
      } else {
        responseText = `I have drafted a booking request for your ${matchedCategory} service. You can review the details on the card below and tap "Confirm & Request" to send it.`
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
