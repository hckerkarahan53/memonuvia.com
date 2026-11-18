import { Button } from "@/components/ui/Button";

export default function HowItWorksPage() {
  return (
    <main className="section-pad mx-auto max-w-4xl px-4 text-center md:px-6">
      <h1 className="font-serif text-4xl font-bold text-teal">How it works</h1>
      <ol className="mt-8 space-y-4 text-left">
        {[
          "Choose a design that fits your story.",
          "Upload a clear photo — stored privately.",
          "Add names or a dedication and preview live.",
          "Checkout securely. Our team prepares print-ready artwork before Printify fulfillment.",
        ].map((step, i) => (
          <li key={step} className="rounded-3xl bg-white p-5 shadow-soft">
            <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-mint-bright font-bold text-white">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <Button href="/shop" className="mt-8">
        Start Personalizing →
      </Button>
    </main>
  );
}
