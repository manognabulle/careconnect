const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;

/**
 * Sends an email using Brevo (Sendinblue) REST API v3
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - Email body in HTML format
 */
const sendEmail = async (to, subject, htmlContent) => {
  console.log(`[BREVO] Preparing to send email to: ${to} | Subject: ${subject}`);
  
  const url = "https://api.brevo.com/v3/smtp/email";
  
  const data = {
    sender: {
      email: SENDER_EMAIL,
      name: "CareConnect"
    },
    to: [
      {
        email: to
      }
    ],
    subject: subject,
    htmlContent: htmlContent
  };

  try {
    console.log("[BREVO] Request Payload:", JSON.stringify(data, null, 2));
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log("[BREVO] Full API Response:", JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log("✅ [BREVO] Email sent successfully:", result);
      return { success: true, data: result };
    } else {
      console.error("❌ [BREVO] API Error Response:", result);
      return { success: false, error: result };
    }
  } catch (err) {
    console.error("❌ [BREVO] Network/Fetch Error:", err);
    return { success: false, error: err.message };
  }
};

module.exports = { sendEmail };
