import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import PublicNav from "@/components/public/PublicNav";
import PublicFooter from "@/components/public/PublicFooter";
import { DOCS, getDoc, DOC_CATEGORIES } from "../data";

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) return {};
  return {
    title: `${doc.title} — VULNRA Docs`,
    description: doc.description,
    alternates: { canonical: `https://vulnra.ai/docs/${slug}` },
    openGraph: {
      title: `${doc.title} — VULNRA Docs`,
      description: doc.description,
      url: `https://vulnra.ai/docs/${slug}`,
      siteName: "VULNRA",
      type: "article",
    },
  };
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const doc = getDoc(slug);
  if (!doc) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": doc.title,
    "description": doc.description,
    "author": { "@type": "Organization", "name": "VULNRA", "url": "https://vulnra.ai" },
    "url": `https://vulnra.ai/docs/${slug}`,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicNav />

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-16">

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              {DOC_CATEGORIES.map((cat) => (
                <div key={cat} className="mb-6">
                  <div className="font-mono text-[8px] tracking-[0.2em] uppercase text-v-muted2 mb-2">{cat}</div>
                  <nav className="flex flex-col gap-0.5">
                    {DOCS.filter((d) => d.category === cat).sort((a, b) => a.order - b.order).map((d) => (
                      <Link
                        key={d.slug}
                        href={`/docs/${d.slug}`}
                        className={`font-mono text-[11px] py-1.5 px-2 rounded-[3px] flex items-center gap-2 transition-colors ${d.slug === slug ? "bg-acid/10 text-acid" : "text-v-muted2 hover:text-acid hover:bg-white/5"}`}
                      >
                        {d.slug === slug && <span className="w-1 h-1 rounded-full bg-acid shrink-0" />}
                        {d.title}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-v-border2">
                <Link href="/docs" className="font-mono text-[10px] text-v-muted2 hover:text-acid transition-colors">
                  ← All docs
                </Link>
              </div>
            </div>
          </aside>

          {/* Main */}
          <article>
            <nav className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-v-muted2 mb-8">
              <Link href="/docs" className="hover:text-acid transition-colors">DOCS</Link>
              <span>/</span>
              <span className="text-v-muted">{doc.category.toUpperCase()}</span>
              <span>/</span>
              <span className="text-foreground">{doc.title.toUpperCase()}</span>
            </nav>

            <header className="mb-10">
              <h1 className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3 leading-snug">
                {doc.title}
              </h1>
              <p className="text-[14px] text-v-muted font-light leading-relaxed">{doc.description}</p>
              <div className="mt-6 h-px bg-v-border2" />
            </header>

            <div className="space-y-10">
              {doc.sections.map((section, i) => (
                <section key={i} id={section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}>
                  <h2 className="font-mono text-lg font-bold tracking-tight text-foreground mb-4 flex items-center gap-3">
                    <span className="text-acid text-[13px] shrink-0">//</span>
                    {section.heading}
                  </h2>
                  <div className="font-mono text-[12.5px] text-v-muted leading-[1.85] whitespace-pre-wrap bg-white/[0.025] border border-v-border rounded-lg p-5">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-14 flex items-center justify-between gap-4 pt-8 border-t border-v-border2">
              {(() => {
                const sorted = DOCS.slice().sort((a, b) => a.order - b.order);
                const idx = sorted.findIndex((d) => d.slug === slug);
                const prev = idx > 0 ? sorted[idx - 1] : null;
                const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
                return (
                  <>
                    {prev ? (
                      <Link href={`/docs/${prev.slug}`} className="group flex flex-col gap-1">
                        <span className="font-mono text-[8.5px] tracking-widest text-v-muted2">← PREVIOUS</span>
                        <span className="font-mono text-[11px] text-v-muted group-hover:text-acid transition-colors">{prev.title}</span>
                      </Link>
                    ) : <div />}
                    {next && (
                      <Link href={`/docs/${next.slug}`} className="group flex flex-col gap-1 text-right">
                        <span className="font-mono text-[8.5px] tracking-widest text-v-muted2">NEXT →</span>
                        <span className="font-mono text-[11px] text-v-muted group-hover:text-acid transition-colors">{next.title}</span>
                      </Link>
                    )}
                  </>
                );
              })()}
            </div>
          </article>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
