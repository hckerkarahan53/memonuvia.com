import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-8 bg-white">
      <div className="h-7 bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 1440 48%27 preserveAspectRatio=%27none%27%3E%3Cpath d=%27M0 28c120-18 240 12 360 0s240-18 360 0 240 18 360 0 240-18 360 0v20H0Z%27 fill=%27%23d8f5ef%27/%3E%3C/svg%3E')] bg-cover" />

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4 md:px-6">
        <div>
          <p className="font-serif text-2xl font-bold text-teal">MemoNuvia</p>
          <p className="mt-2 text-sm text-teal/70">Your memories, beautifully preserved.</p>
        </div>
        <FooterCol
          title="Explore"
          links={[
            ["Family", "/shop?category=family"],
            ["Couples", "/shop?category=couples"],
            ["Pets", "/shop?category=pets"],
            ["Kids", "/shop?category=kids"],
            ["Portraits", "/shop?category=portraits"],
          ]}
        />
        <FooterCol
          title="Help"
          links={[
            ["Contact", "/contact"],
            ["Track Order", "/track"],
            ["Shipping & Returns", "/shipping"],
            ["FAQs", "/#faq"],
          ]}
        />
        <FooterCol
          title="Information"
          links={[
            ["About Us", "/about"],
            ["Privacy Policy", "/privacy"],
            ["Terms & Conditions", "/terms"],
          ]}
        />
      </div>
      <div className="border-t border-teal/10 py-6 text-center font-semibold text-teal">MemoNuvia.com</div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="relative mb-3 inline-block font-semibold text-teal">
        {title}
        <span className="absolute -bottom-1 left-0 h-0.5 w-10 rounded bg-gold" />
      </h3>
      <ul className="space-y-2 text-sm text-teal/70">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="hover:text-teal">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
