import { env } from '../config/env';

export function wrapInHtmlTemplate(body: string, options?: {
  recipientName?: string;
  subject?: string;
  projectName?: string;
  headerText?: string;
  headerColor?: string;
  headerAlign?: string;
  bodyAlign?: string;
  footerText?: string;
  footerAlign?: string;
}): string {
  const headerText = options?.headerText || 'DesignFlow';
  const headerColor = options?.headerColor || 'linear-gradient(135deg,#1e40af 0%,#7c3aed 100%)';
  const headerAlign = options?.headerAlign || 'center';
  const bodyAlign = options?.bodyAlign || 'left';
  const footerText = options?.footerText || 'Email ini dikirim secara otomatis melalui DesignFlow.';
  const footerAlign = options?.footerAlign || 'center';

  const greeting = options?.recipientName
    ? `<p style="margin:0 0 20px 0;color:#374151;font-size:15px;line-height:1.7;">Yth. <strong>${options.recipientName}</strong>,</p>`
    : '';

  const htmlBody = body.replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options?.subject || headerText}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:${headerColor};padding:36px 40px;text-align:${headerAlign};">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="text-align:${headerAlign};">
                    ${headerAlign === 'center' ? `
                    <div style="display:inline-block;width:48px;height:48px;background:rgba(255,255,255,0.15);border-radius:12px;margin-bottom:12px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;height:100%;">
                        <tr><td align="center" valign="middle" style="color:#ffffff;font-size:22px;font-weight:700;">${headerText.charAt(0)}</td></tr>
                      </table>
                    </div>
                    ` : ''}
                    <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0;letter-spacing:-0.3px;">${headerText}</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${options?.projectName ? `
          <!-- Project Badge -->
          <tr>
            <td style="padding:24px 40px 0 40px;text-align:${bodyAlign};">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#f0f7ff;border:1px solid #dbeafe;border-radius:10px;width:100%;">
                <tr>
                  <td style="padding:14px 18px;text-align:${bodyAlign};">
                    <span style="color:#1e40af;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Proyek</span>
                    <p style="color:#1e3a5f;font-size:15px;font-weight:600;margin:4px 0 0 0;">${options.projectName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 40px;text-align:${bodyAlign};">
              ${greeting}
              <div style="color:#4b5563;font-size:15px;line-height:1.7;">
                ${htmlBody}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:24px 40px;text-align:${footerAlign};border-top:1px solid #e5e7eb;">
              <p style="color:#94a3b8;font-size:12px;margin:0 0 8px 0;line-height:1.6;">
                ${footerText}<br>
                ${options?.subject ? `Subjek: ${options.subject}` : ''}
              </p>
              <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.5;">
                &copy; ${new Date().getFullYear()} ${env.email.fromName || headerText}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

        <!-- Postscript -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 0 0 0;text-align:center;">
              <p style="color:#94a3b8;font-size:11px;margin:0;line-height:1.5;">
                Jika Anda memiliki pertanyaan, hubungi kami melalui platform DesignFlow.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
