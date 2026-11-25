import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectsDeck } from "@/components/projects/deck";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/lib/locale";
import { getDb } from "@/server/db";
import { listPublishedProjects } from "@/server/projects/public";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return { title: dict.projects.title, description: dict.projects.subtitle };
}

export default async function ProjectsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const projects = await listPublishedProjects(getDb(), lang);
  return <ProjectsDeck lang={lang} projects={projects} labels={dict.projects} />;
}
