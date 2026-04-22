import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { featuredTool, homePageContent, toolCategories } from "@/content/tools";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/ui/container";

const homeTitle = "Browser-Based Developer Tools";
const homeDescription =
  "Authos is a collection of browser-based developer tools for CI, config, schema, and infrastructure files. Start with the GitHub Actions analyzer for local, no-login diagnostics.";

export const metadata: Metadata = {
  title: homeTitle,
  description: homeDescription,
  openGraph: {
    title: `Authos | ${homeTitle}`,
    description: homeDescription,
    siteName: "Authos",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    description: homeDescription,
    title: `Authos | ${homeTitle}`,
  },
};

export default function Home() {
  return (
    <Container
      className="flex flex-col gap-14 py-16 sm:py-20"
      data-testid="home-page"
    >
      <section
        className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_25rem] xl:items-center"
        data-testid="home-hero"
      >
        <div className="space-y-6">
          <Badge tone="info">Browser-based developer tools</Badge>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {homePageContent.hero.headline}
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              {homePageContent.hero.subheadline}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={featuredTool.href} className={buttonVariants()}>
              {homePageContent.hero.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-sm text-muted-foreground">
              No login required. Files stay local in the browser for the
              available analyzer.
            </p>
          </div>
        </div>

        <Card
          className="border-accent/15 bg-card/95"
          data-testid="directory-summary-card"
        >
          <CardHeader>
            <Badge className="w-fit" tone="success">
              Launch-ready directory
            </Badge>
            <CardTitle>Authos ships focused tools, not a grab bag.</CardTitle>
            <CardDescription>
              Start with one real browser-local analyzer now, then expand across
              CI, config, schema, and infrastructure workflows without changing
              the shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Live tools", value: "1 available today" },
              { label: "Core access", value: "No login" },
              { label: "Processing", value: "Browser-first" },
              { label: "Checks", value: "Deterministic" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/80 bg-background/70 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-2 text-base font-semibold text-foreground">
                  {item.value}
                </p>
              </div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            {featuredTool.tags.map((tag) => (
              <Badge key={tag} tone="subtle">
                {tag}
              </Badge>
            ))}
          </CardFooter>
        </Card>
      </section>

      <section className="space-y-6" data-testid="featured-tool-section">
        <div className="space-y-3">
          <Badge tone="success">Featured tool</Badge>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {featuredTool.name}
            </h2>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {featuredTool.shortDescription}
            </p>
          </div>
        </div>

        <Card className="border-accent/20" data-testid="featured-tool-card">
          <CardContent className="grid gap-8 px-6 pb-6 pt-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">Available now</Badge>
                <Badge tone="info">{featuredTool.category}</Badge>
                <Badge tone="subtle">{featuredTool.privacy}</Badge>
              </div>
              <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>
                  The GitHub Actions analyzer is the first live Authos tool. It
                  works without login, processes workflow YAML locally in the
                  browser, and is designed to turn CI risk into readable,
                  exportable feedback.
                </p>
                <p>
                  Use it when you need quick checks on syntax, permissions,
                  triggers, reliability settings, and supply-chain hygiene
                  before a workflow reaches a pull request or production branch.
                </p>
              </div>
              <Link className={buttonVariants()} href={featuredTool.href}>
                Open GitHub Actions Analyzer
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  description: homePageContent.featuredBenefits[0].description,
                  icon: LockKeyhole,
                  title: homePageContent.featuredBenefits[0].title,
                },
                {
                  description: homePageContent.featuredBenefits[1].description,
                  icon: BadgeCheck,
                  title: homePageContent.featuredBenefits[1].title,
                },
                {
                  description: homePageContent.featuredBenefits[2].description,
                  icon: FileCheck2,
                  title: homePageContent.featuredBenefits[2].title,
                },
                {
                  description: homePageContent.featuredBenefits[3].description,
                  icon: ShieldCheck,
                  title: homePageContent.featuredBenefits[3].title,
                },
              ].map(({ description, icon: Icon, title }) => (
                <div
                  key={title}
                  className="rounded-xl border border-border/80 bg-background/75 p-4"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6" data-testid="tool-categories-section">
        <div className="space-y-3">
          <Badge tone="info">Tool categories</Badge>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              A credible directory now, with room to grow later.
            </h2>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              Authos is being built as a collection of focused tools. Only the
              live GitHub Actions analyzer links today; the remaining categories
              are clearly marked as future work instead of fake pages.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {toolCategories.map((category) => {
            const cardContent = (
              <Card
                className="flex h-full flex-col border-border/80 bg-card/95 transition-colors"
                data-state={category.status}
              >
                <CardHeader>
                  <Badge
                    className="w-fit"
                    tone={
                      category.status === "available" ? "success" : "subtle"
                    }
                  >
                    {category.status === "available" ? "Available" : "Planned"}
                  </Badge>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 text-sm leading-6 text-muted-foreground">
                  {category.note}
                </CardContent>
                <CardFooter>
                  {category.href ? (
                    <span className="text-sm font-medium text-accent">
                      Open available tool
                    </span>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Future category placeholder
                    </span>
                  )}
                </CardFooter>
              </Card>
            );

            return category.href ? (
              <Link
                key={category.name}
                className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                href={category.href}
              >
                {cardContent}
              </Link>
            ) : (
              <div key={category.name}>{cardContent}</div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4" data-testid="trust-strip">
        <Badge tone="subtle">Trust strip</Badge>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {homePageContent.trustStrip.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-border/80 bg-card/85 px-4 py-4 text-sm font-medium text-foreground"
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </Container>
  );
}
