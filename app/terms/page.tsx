import Link from "next/link";

const updated = "24 August 2026";

export default function TermsPage() {
  return (
    <div className="pmp-pageShell">
      <article className="pmp-sectionCard" style={{ maxWidth: 880, margin: "0 auto" }}>
        <div className="pmp-kicker">Legal</div>
        <h1 className="pmp-pageTitle">Terms of Use</h1>
        <p className="pmp-mutedText">Last updated: {updated}</p>

        <LegalSection title="About these terms">
          <p>These terms govern your use of the Pinch My Pony website and mobile app. By creating an account or using the service, you agree to them. Contact <a href="mailto:support@pinchmypony.com">support@pinchmypony.com</a> with questions.</p>
        </LegalSection>

        <LegalSection title="Eligibility and accounts">
          <p>You must be at least 18, able to enter into an agreement, and provide accurate account information. One account can be used to list horses and request arrangements. Keep your sign-in details secure and tell us promptly if you believe your account has been misused.</p>
        </LegalSection>

        <LegalSection title="What Pinch My Pony provides">
          <p>Pinch My Pony provides tools for members to publish horse listings, communicate, request dates and leave reviews. Unless expressly stated otherwise, Pinch My Pony is not the owner, keeper, rider, instructor, agent, insurer or party to arrangements made between members.</p>
          <p>We do not guarantee that a member, horse, listing, review, identity check, availability entry or arrangement is accurate, suitable, safe, insured or continuously available. Members must make their own checks and decisions.</p>
        </LegalSection>

        <LegalSection title="Member responsibilities">
          <ul>
            <li>Provide honest, current information about yourself, your experience, horses and availability.</li>
            <li>Discuss rider suitability, horse welfare, supervision, equipment, activities, costs, insurance and emergency arrangements before proceeding.</li>
            <li>Follow applicable laws, yard rules, welfare standards and reasonable safety instructions.</li>
            <li>Use respectful communication and do not harass, discriminate, deceive, threaten or exploit another person.</li>
            <li>Do not publish unlawful content, impersonate others, manipulate reviews, scrape the service or attempt to bypass security.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Safety, welfare and insurance">
          <p>Horse activities carry inherent risks. Do not proceed if an arrangement appears unsuitable or unsafe. Members are responsible for checking appropriate insurance and any permissions required for their activities. An identity status or platform review is not a safety guarantee, professional assessment or insurance confirmation.</p>
          <p>See our <Link href="/safety">Safety guidance</Link> and report concerns through <Link href="/contact">support</Link>. Contact the appropriate emergency service for immediate danger.</p>
        </LegalSection>

        <LegalSection title="Launch access, membership and payments">
          <p>During launch access, features may be provided without charge and without creating a paid subscription. A displayed free-access period does not create an automatic paid renewal. If paid membership is introduced, the price, billing period, cancellation terms and any trial conditions will be shown before a member expressly opts in through Stripe.</p>
          <p>Members remain responsible for any separate costs they agree directly with each other. Pinch My Pony does not currently collect or guarantee those member-to-member payments.</p>
        </LegalSection>

        <LegalSection title="Content and moderation">
          <p>You retain ownership of content you submit, while granting Pinch My Pony permission to host, display and process it as needed to operate and promote the service. You confirm that you have the right to share that content. We may remove content, restrict features or suspend accounts where reasonably necessary for safety, security, legal compliance or enforcement of these terms.</p>
        </LegalSection>

        <LegalSection title="Availability and liability">
          <p>We may change, suspend or discontinue features and cannot promise uninterrupted or error-free service. Nothing in these terms excludes liability that cannot lawfully be excluded, or affects statutory consumer rights. Subject to those protections, Pinch My Pony is not responsible for losses caused by member-to-member arrangements, inaccurate member content, horse activities, events outside our reasonable control, or use contrary to these terms.</p>
        </LegalSection>

        <LegalSection title="Ending use and changes">
          <p>You may stop using the service and request account deletion. We may suspend or close an account for serious or repeated breaches, safety risk, fraud, unlawful activity or platform security. We may update these terms as the service develops and will provide reasonable notice where a change materially affects members.</p>
        </LegalSection>

        <LegalSection title="Law and contact">
          <p>These terms are governed by the laws of England and Wales, without removing any mandatory rights you may have where you live. Contact <a href="mailto:support@pinchmypony.com">support@pinchmypony.com</a> if you have a complaint so we can try to resolve it.</p>
        </LegalSection>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <Link href="/privacy" className="pmp-ctaSecondary">Privacy Policy</Link>
          <Link href="/contact" className="pmp-ctaPrimary">Contact support</Link>
        </div>
      </article>
    </div>
  );
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section style={{ marginTop: 24, lineHeight: 1.72 }}><h2 className="pmp-sectionTitle">{title}</h2>{children}</section>;
}
