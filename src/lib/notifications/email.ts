type NewMessageEmailInput = {
  to: string;
  recipientName: string;
  senderName: string;
  conversationUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendNewMessageEmail({
  to,
  recipientName,
  senderName,
  conversationUrl,
}: NewMessageEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[email] RESEND_API_KEY not set, skipping notification");
    return;
  }

  const safeRecipientName = escapeHtml(recipientName || "بك");
  const safeSenderName = escapeHtml(senderName || "مستخدم");
  const safeConversationUrl = escapeHtml(conversationUrl);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DawaMudir <onboarding@resend.dev>",
        to: [to],
        subject: "رسالة جديدة على DawaMudir",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.7;">
            <p>مرحبًا ${safeRecipientName}،</p>
            <p>لديك رسالة جديدة من ${safeSenderName} على DawaMudir.</p>
            <p><a href="${safeConversationUrl}">افتح المحادثة</a></p>
          </div>
        `,
        text: `لديك رسالة جديدة من ${senderName || "مستخدم"} على DawaMudir\n${conversationUrl}`,
      }),
    });

    if (!response.ok) {
      console.log(`[email] notification failed with status ${response.status}`);
    }
  } catch (error) {
    console.log("[email] notification fetch failed", error);
  }
}
