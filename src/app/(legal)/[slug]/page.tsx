const pages: Record<string, { title: string; body: string }> = {
  about: {
    title: "About Us",
    body: "MemoNuvia turns favorite photos into personalized natural slate keepsakes — made with your photo and names, fulfilled with care.",
  },
  contact: {
    title: "Contact",
    body: "Reach us at hello@memonuvia.com. We typically reply within one business day.",
  },
  shipping: {
    title: "Shipping & Returns",
    body: "Orders are produced after artwork approval. Production usually takes 2–5 business days. Damaged items are replaced when reported with photos within 7 days of delivery.",
  },
  privacy: {
    title: "Privacy Policy",
    body: "We store account, order, shipping, and personalization data securely in Supabase. Customer photos are private. Payment card details are handled by Stripe and never stored on our servers.",
  },
  terms: {
    title: "Terms & Conditions",
    body: "By placing an order you confirm that you own the rights to uploaded photos and agree to personalized production. Custom items may not be returnable unless defective or damaged in transit.",
  },
};

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) {
    return (
      <main className="section-pad mx-auto max-w-2xl px-4 text-center">
        <h1 className="font-serif text-3xl text-teal">Not found</h1>
      </main>
    );
  }
  return (
    <main className="section-pad mx-auto max-w-2xl px-4">
      <h1 className="font-serif text-4xl font-bold text-teal">{page.title}</h1>
      <p className="mt-4 leading-relaxed text-teal/80">{page.body}</p>
    </main>
  );
}
