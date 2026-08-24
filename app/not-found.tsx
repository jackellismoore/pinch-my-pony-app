import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="pmp-pageShell">
      <section className="pmp-sectionCard">
        <div className="pmp-emptyState">
          <div className="pmp-emptyIcon"><Icon name="compass" size={31} /></div>
          <div className="pmp-kicker">Page not found</div>
          <h1 className="pmp-pageTitle">That path has wandered off</h1>
          <p className="pmp-emptyText">
            The page may have moved or the link may be out of date. You can continue browsing without losing your account activity.
          </p>
          <div className="pmp-cardActions" style={{ justifyContent: "center" }}>
            <Link href="/browse" className="pmp-ctaPrimary">Browse horses</Link>
            <Link href="/dashboard" className="pmp-ctaSecondary">Open dashboard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
