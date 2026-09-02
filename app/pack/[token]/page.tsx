import type { Metadata } from "next";
import Link from "next/link";
import { PackResult } from "@/components/pack-result";
import { isValidToken } from "@/lib/storage/token";
import { loadPack } from "@/lib/storage/packs";

// The token is the credential. It must never end up somewhere that leaks it
// sideways: not in a title, not in analytics, not to a search engine.
export const metadata: Metadata = {
  title: "Your saved pack — Governance AI",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// KV is the source of truth and the record can change between requests
// (a checklist tick, expiry), so this route must never be statically cached.
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function SavedPackPage({ params }: PageProps) {
  const { token } = await params;

  // Reject anything that doesn't even look like a token before it reaches KV.
  if (!isValidToken(token)) {
    return <NotFoundState />;
  }

  const result = await loadPack(token);

  if (result.status === "not-found") {
    return <NotFoundState />;
  }

  if (result.status === "expired") {
    return <ExpiredState />;
  }

  return <PackResult pack={result.pack} token={token} checklistState={result.pack.checklistState} />;
}

function NotFoundState() {
  return (
    <main className="pack">
      <section className="section-block" style={{ textAlign: "center" }}>
        <p className="kicker">We can&rsquo;t find that pack</p>
        <h1 className="h2">This link doesn&rsquo;t match a saved pack.</h1>
        <p className="lede">
          It may have been typed or copied slightly wrong, or the pack may
          simply never have existed at this address. Nothing has been deleted
          — if you have the link elsewhere, it&rsquo;s worth checking it
          carefully against what&rsquo;s in your browser.
        </p>
        <p>
          <Link className="button primary" href="/start">
            Create a new pack
          </Link>
        </p>
      </section>
    </main>
  );
}

function ExpiredState() {
  return (
    <main className="pack">
      <section className="section-block" style={{ textAlign: "center" }}>
        <p className="kicker">This link has expired</p>
        <h1 className="h2">Saved links last 90 days from when they&rsquo;re created.</h1>
        <p className="lede">
          Your pack itself hasn&rsquo;t been changed or removed — only this
          particular link into it has stopped working, because that&rsquo;s
          how long the link is valid for. Returning to it earlier
          wouldn&rsquo;t have extended that window; it&rsquo;s a fixed 90 days
          from creation.
        </p>
        <p className="lede">
          If you still need this pack, the quickest way forward is to run the
          check again and save the new link somewhere you&rsquo;ll find it.
        </p>
        <p>
          <Link className="button primary" href="/start">
            Create a fresh pack
          </Link>
        </p>
      </section>
    </main>
  );
}
