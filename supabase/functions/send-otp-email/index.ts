import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const SEND_EMAIL_HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET")

serve(async (req) => {
  // 1. Only allow POST requests from Supabase
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { status: 405, headers: { "Content-Type": "application/json" } }
    )
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    let event: any
    // Verify Webhook signature if secret is set in project env
    if (SEND_EMAIL_HOOK_SECRET) {
      const cleanSecret = SEND_EMAIL_HOOK_SECRET.replace("v1,whsec_", "")
      const wh = new Webhook(cleanSecret)
      try {
        event = wh.verify(payload, headers)
      } catch (err) {
        console.error("Webhook signature verification failed:", err)
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }), 
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      }
    } else {
      // Fallback parser if hook secret is not yet set during testing
      event = JSON.parse(payload)
    }

    const { token, email_action_type } = event
    const recipientEmail = event.email || event.user?.email || event.user?.new_email || event.user?.email_change

    if (!recipientEmail || !token) {
      return new Response(
        JSON.stringify({ error: "Missing recipient email or token in webhook payload" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY in secrets environment")
      return new Response(
        JSON.stringify({ error: "Edge function misconfigured: missing Resend API key" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      )
    }

    // 2. Generate premium responsive transactional HTML showing ONLY the 6-digit OTP code
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your USTAD Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #FFFFFF;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 460px;
      margin: 40px auto;
      padding: 36px;
      border: 1px solid #EAF1FE;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(47, 111, 237, 0.03);
    }
    .header {
      margin-bottom: 24px;
    }
    .logo {
      font-size: 20px;
      font-weight: 800;
      color: #2F6FED;
      letter-spacing: -0.5px;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #1F2937;
      margin-top: 24px;
      margin-bottom: 8px;
    }
    .desc {
      font-size: 13px;
      color: #6F767E;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .code-container {
      background-color: #F5F6F8;
      border: 1px solid #EAF1FE;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin-bottom: 28px;
    }
    .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 5px;
      color: #2F6FED;
      margin: 0;
    }
    .footer {
      font-size: 11px;
      color: #6F767E;
      opacity: 0.8;
      border-top: 1px solid #F5F6F8;
      padding-top: 16px;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo">USTAD</span>
    </div>
    <h1 class="title">Verification Code</h1>
    <p class="desc">Please use the 6-digit verification code below to authenticate your account. This code is valid for 10 minutes. For your security, do not share this code with anyone.</p>
    <div class="code-container">
      <h2 class="code">${token}</h2>
    </div>
    <div class="footer">
      This is an automated security message from USTAD. If you did not request this verification code, you can safely ignore this email.
    </div>
  </div>
</body>
</html>
`

    // 3. Post to Resend API endpoint
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "USTAD <onboarding@resend.dev>", // default Resend sender for testing
        to: recipientEmail,
        subject: `Your USTAD Verification Code: ${token}`,
        html: htmlEmail,
      }),
    })

    if (!resendRes.ok) {
      const errorText = await resendRes.text()
      console.error(`Resend API failed: ${resendRes.status} - ${errorText}`)
      return new Response(
        JSON.stringify({ error: `Resend API failed: ${resendRes.statusText}` }), 
        { status: 502, headers: { "Content-Type": "application/json" } }
      )
    }

    console.log(`Successfully sent auth email via Resend to ${recipientEmail}`)
    return new Response(
      JSON.stringify({ success: true }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    )

  } catch (error: any) {
    console.error("Fatal error inside Send Email Auth Hook:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
