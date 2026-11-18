import { Button } from "@/components/ui/Button";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <main className="section-pad mx-auto max-w-xl px-4 text-center">
      <h1 className="font-serif text-4xl font-bold text-teal">Order confirmed</h1>
      <p className="mt-3 text-teal/70">
        Thank you. {order ? `Your order ${order} is paid` : "Your payment was received"} and is awaiting artwork
        review before printing.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button href="/track">Track order →</Button>
        <Button href="/shop" variant="ghost">
          Continue shopping
        </Button>
      </div>
    </main>
  );
}
