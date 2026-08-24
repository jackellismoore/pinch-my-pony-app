import Link from "next/link";

const sections = [
  {
    title: "Before agreeing",
    items: [
      "Keep conversations in Pinch My Pony so the arrangement is clear.",
      "Discuss experience, riding ability, horse needs, dates, supervision, costs, and cancellation expectations.",
      "Arrange an introductory meeting before the first ride and do not proceed if either person feels uncomfortable.",
    ],
  },
  {
    title: "Horse welfare and suitability",
    items: [
      "Be honest about temperament, health, workload, rider suitability, restrictions, and required equipment.",
      "Only agree to activities that are appropriate for both the horse and rider.",
      "Stop the arrangement if the horse’s welfare or anybody’s safety may be at risk.",
    ],
  },
  {
    title: "Personal safety",
    items: [
      "Tell someone you trust where you are going and when you expect to return.",
      "Meet in daylight where possible and avoid sharing unnecessary private information.",
      "Use suitable protective equipment and follow the yard’s rules and emergency procedures.",
    ],
  },
];

export default function SafetyPage() {
  return (
    <div className="pmp-pageShell">
      <section className="pmp-sectionCard">
        <div className="pmp-kicker">Trust & safety</div>
        <h1 className="pmp-pageTitle">Share horses with confidence</h1>
        <p className="pmp-mutedText" style={{ marginTop: 8, lineHeight: 1.7, maxWidth: 760 }}>
          Pinch My Pony helps members connect, but every real-world arrangement still needs clear
          communication, sensible checks, and good judgement from everyone involved.
        </p>
      </section>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {sections.map((section) => (
          <section key={section.title} className="pmp-sectionCard">
            <h2 className="pmp-sectionTitle">{section.title}</h2>
            <ul style={{ margin: "12px 0 0", paddingLeft: 20, display: "grid", gap: 10, lineHeight: 1.65 }}>
              {section.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>

      <section className="pmp-sectionCard" style={{ marginTop: 12 }}>
        <div className="pmp-kicker">Something feels wrong?</div>
        <h2 className="pmp-sectionTitle">Report a concern</h2>
        <p className="pmp-mutedText" style={{ marginTop: 8, lineHeight: 1.7 }}>
          Do not continue an arrangement that feels unsafe. Contact us with the member, horse,
          request, or message details available to you. For an immediate emergency, contact the
          appropriate emergency service rather than waiting for an app response.
        </p>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/contact" className="pmp-ctaPrimary">Contact safety support</Link>
          <Link href="/faq" className="pmp-ctaSecondary">Read FAQs</Link>
        </div>
      </section>
    </div>
  );
}
