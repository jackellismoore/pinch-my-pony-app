type EmailAction = {
  label: string;
  href: string;
};

type BrandedEmailOptions = {
  preheader: string;
  eyebrow: string;
  title: string;
  intro: string;
  contentHtml?: string;
  action?: EmailAction;
  footerNote?: string;
};

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function brandedEmail({
  preheader,
  eyebrow,
  title,
  intro,
  contentHtml = "",
  action,
  footerNote = "This is a service email from Pinch My Pony.",
}: BrandedEmailOptions): string {
  const actionHtml = action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px"><tr><td style="border-radius:12px;background:#1F4B36"><a href="${escapeEmailHtml(action.href)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:15px;line-height:20px;font-weight:700">${escapeEmailHtml(action.label)}</a></td></tr></table>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeEmailHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F1EA;color:#17213A">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeEmailHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4F1EA">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px">
            <tr>
              <td style="padding:0 4px 16px">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                  <td width="52" height="52" align="center" style="width:52px;height:52px;vertical-align:middle;border-radius:13px;background:#F7F4EC;border:1px solid #DDD7CA"><img src="https://pinchmypony.com/pmp-logo-web.png" width="46" height="46" alt="Pinch My Pony" style="display:block;width:46px;height:46px;object-fit:contain;border:0"></td>
                  <td style="vertical-align:middle;padding-left:12px;font-family:Arial,sans-serif;font-size:18px;line-height:24px;font-weight:700;color:#17213A">Pinch My Pony</td>
                </tr></table>
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;border:1px solid #DDD7CA;border-radius:20px;background:#FFFFFF;box-shadow:0 12px 30px rgba(23,33,58,.08)">
                <div style="height:6px;background:linear-gradient(90deg,#1F4B36 0%,#C8A24D 100%)"></div>
                <div style="padding:36px 36px 32px">
                  <div style="font-family:Arial,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#557461">${escapeEmailHtml(eyebrow)}</div>
                  <h1 style="margin:10px 0 14px;font-family:Arial,sans-serif;font-size:30px;line-height:37px;letter-spacing:-.5px;color:#17213A">${escapeEmailHtml(title)}</h1>
                  <p style="margin:0;font-family:Arial,sans-serif;font-size:16px;line-height:26px;color:#4E5668">${escapeEmailHtml(intro)}</p>
                  ${actionHtml}
                  ${contentHtml}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 18px 0;font-family:Arial,sans-serif;font-size:12px;line-height:19px;color:#777D89">
                ${escapeEmailHtml(footerNote)}<br>
                <a href="https://pinchmypony.com" style="color:#1F4B36;text-decoration:none;font-weight:700">pinchmypony.com</a>
                &nbsp;·&nbsp;
                <a href="mailto:support@pinchmypony.com" style="color:#1F4B36;text-decoration:none;font-weight:700">support@pinchmypony.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
