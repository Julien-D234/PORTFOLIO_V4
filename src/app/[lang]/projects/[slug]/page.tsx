import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { getDb } from "@/server/db";
import { getPublishedProject } from "@/server/projects/public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const project = await getPublishedProject(getDb(), lang, slug);
  if (!project) return {};
  return { title: project.title, description: project.summary };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const project = await getPublishedProject(getDb(), lang, slug);
  if (!project) notFound();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 p-6 pb-24">
      <Link href={`/${lang}/projects`} className="text-13px" style={{ color: "var(--acc)" }}>
        ← {dict.projects.backToList}
      </Link>
      <h1 className="text-30px leading-tight" style={{ textWrap: "balance" }}>
        {project.title}
      </h1>
      <div className="flex flex-wrap items-center gap-2 text-13px" style={{ color: "var(--mut)" }}>
        {project.publishedAt ? (
          <time dateTime={project.publishedAt.toISOString()}>
            {dict.projects.publishedOn} {project.publishedAt.toISOString().slice(0, 10)}
          </time>
        ) : null}
        {project.tags.map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {project.url ? (
          <a className="btn ghost" href={project.url} target="_blank" rel="noopener noreferrer">
            {dict.projects.site} ↗
          </a>
        ) : null}
        {project.repoUrl ? (
          <a className="btn ghost" href={project.repoUrl} target="_blank" rel="noopener noreferrer">
            {dict.projects.repo} ↗
          </a>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap text-15px">{project.description}</p>
      {project.gallery.length > 0 ? (
        <>
          <h2 className="text-18px">{dict.projects.gallery}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {project.gallery.map((g) => (
              <figure key={g.id} className="m-0">
                <div className="duo aspect-16/10 rounded-(--r) border-2 border-(--ink) shadow-[4px_4px_0_var(--shadow-c)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt={g.alt ?? ""} loading="lazy" />
                </div>
                {g.caption ? (
                  <figcaption className="pt-1 text-12px" style={{ color: "var(--mut)" }}>
                    {g.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
