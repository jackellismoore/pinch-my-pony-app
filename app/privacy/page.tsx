import Link from "next/link";

const updated = "24 August 2026";

export default function PrivacyPage() {
  return (
    <div className="pmp-pageShell">
      <article className="pmp-sectionCard" style={{ maxWidth: 880, margin: "0 auto" }}>
        <div className="pmp-kicker">Legal</div>
        <h1 className="pmp-pageTitle">Privacy Policy</h1>
        <p className="pmp-mutedText">Last updated: {updated}</p>

        <LegalSection title="Who we are">
          <p>Pinch My Pony operates the Pinch My Pony website and mobile app. For privacy enquiries, contact <a href="mailto:support@pinchmypony.com">support@pinchmypony.com</a>.</p>
        </LegalSection>

        <LegalSection title="Information we collect">
          <ul>
            <li>Account information such as your email address, display name and authentication records.</li>
            <li>Profile and listing information, including photos, biography, general location, horse details and availability.</li>
            <li>Requests, messages, reviews, notification preferences and support communications.</li>
            <li>Technical and security information such as device, browser, app, IP, session, audit and push-notification data.</li>
            <li>Membership, payment-status and identity-verification status when those Stripe features are enabled. Stripe processes payment and identity evidence under its own privacy terms; Pinch My Pony does not intend to store copies of identity documents.</li>
          </ul>
        </LegalSection>

        <LegalSection title="How and why we use information">
          <p>We use information to provide accounts, listings, requests, messaging, reviews and notifications; operate membership and verification when enabled; prevent misuse; protect members and horses; answer support requests; maintain and improve the service; and meet legal obligations.</p>
          <p>Depending on the activity, our lawful bases may include performing our agreement with you, our legitimate interests in operating and securing the platform, compliance with legal obligations, and consent where required. You can withdraw consent for optional communications or notifications at any time.</p>
        </LegalSection>

        <LegalSection title="Who receives information">
          <p>Information may be processed by service providers supporting the platform, including Supabase for account and database services, Vercel for hosting, Resend for service email, Google Maps for location features, Apple and web-push providers for notifications, and Stripe for membership or identity services when enabled. We may also disclose information where required by law or reasonably necessary to investigate safety, fraud or security concerns.</p>
          <p>Other members can see the profile, listing, review and arrangement information you choose to share through the platform. Do not publish precise private addresses or information you do not want another member to receive.</p>
        </LegalSection>

        <LegalSection title="International processing and security">
          <p>Some providers may process information outside the UK. Where required, we rely on appropriate contractual or legal safeguards. We use access controls and technical measures intended to protect information, but no internet service can guarantee absolute security.</p>
        </LegalSection>

        <LegalSection title="Retention and account deletion">
          <p>We keep information for as long as needed to provide and secure the service, resolve disputes, meet legal obligations and enforce agreements. You can request account deletion from your profile. Some limited records may be retained where legally required, necessary for safety or fraud prevention, or temporarily present in protected backups.</p>
        </LegalSection>

        <LegalSection title="Your rights">
          <p>UK data-protection rights may include access, correction, erasure, restriction, objection and data portability, depending on the circumstances. Contact <a href="mailto:support@pinchmypony.com">support@pinchmypony.com</a> to make a request. You may also complain to the <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer">Information Commissioner’s Office</a>.</p>
        </LegalSection>

        <LegalSection title="Children and changes">
          <p>Pinch My Pony is intended for adults aged 18 or over. We may update this policy as the service changes and will update the date above or provide additional notice for material changes.</p>
        </LegalSection>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <Link href="/terms" className="pmp-ctaSecondary">Terms of Use</Link>
          <Link href="/contact" className="pmp-ctaPrimary">Contact support</Link>
        </div>
      </article>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ marginTop: 24, lineHeight: 1.72 }}><h2 className="pmp-sectionTitle">{title}</h2>{children}</section>;
}
