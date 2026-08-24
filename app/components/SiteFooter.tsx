import Image from "next/image";
import Link from "next/link";

const groups = [
  { title: "Explore", links: [["Browse horses", "/browse"], ["Membership", "/dashboard/membership"]] },
  { title: "Support", links: [["Help centre", "/help"], ["Safety", "/safety"], ["Contact", "/contact"]] },
  { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"]] },
] as const;

export default function SiteFooter() {
  return (
    <footer className="pmp-siteFooter">
      <div className="pmp-siteFooterInner">
        <div className="pmp-siteFooterBrand">
          <Image src="/pmp-logo-web.png" width={42} height={42} alt="" />
          <div><strong>Pinch My Pony</strong><span>Borrow. Share. Connect.</span></div>
        </div>
        <nav className="pmp-siteFooterNav" aria-label="Footer navigation">
          {groups.map((group) => (
            <div key={group.title}><strong>{group.title}</strong>{group.links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>
          ))}
        </nav>
      </div>
      <div className="pmp-siteFooterBottom">© {new Date().getFullYear()} Pinch My Pony</div>
    </footer>
  );
}
