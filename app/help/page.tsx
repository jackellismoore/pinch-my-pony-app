import Link from "next/link";

const helpLinks = [
  {
    href: "/faq",
    icon: "🧾",
    title: "Frequently asked questions",
    description: "Quick answers about accounts, listings, requests and using Pinch My Pony.",
  },
  {
    href: "/safety",
    icon: "🛡️",
    title: "Safety guidance",
    description: "Practical guidance for safer introductions and horse-sharing arrangements.",
  },
  {
    href: "/contact",
    icon: "✉️",
    title: "Contact support",
    description: "Send us a message if you need help or want to report a concern.",
  },
  {
    href: "/terms",
    icon: "📄",
    title: "Terms of Use",
    description: "The rules and responsibilities that apply when using the platform.",
  },
  {
    href: "/privacy",
    icon: "🔐",
    title: "Privacy Policy",
    description: "How Pinch My Pony collects, uses and protects your information.",
  },
];

export default function HelpPage() {
  return (
    <div className="pmp-pageShell">
      <section className="pmp-sectionCard">
        <div className="pmp-kicker">Help &amp; information</div>
        <h1 className="pmp-pageTitle">How can we help?</h1>
        <p className="pmp-mutedText" style={{ marginTop: 8, lineHeight: 1.7, maxWidth: 720 }}>
          Find answers, read our safety guidance, review our policies or contact the Pinch My Pony team.
        </p>
      </section>

      <nav className="pmp-helpGrid" aria-label="Help and information" style={{ marginTop: 12 }}>
        {helpLinks.map((item) => (
          <Link key={item.href} href={item.href} className="pmp-helpCard pmp-hoverLift">
            <span className="pmp-helpIcon" aria-hidden="true">{item.icon}</span>
            <span>
              <span className="pmp-helpTitle">{item.title}</span>
              <span className="pmp-helpDescription">{item.description}</span>
            </span>
            <span className="pmp-helpArrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
