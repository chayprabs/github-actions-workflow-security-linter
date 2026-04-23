"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  analyzerCheckAreas,
  analyzerExampleWorkflows,
  analyzerFaqItems,
  analyzerHowItWorksSteps,
  analyzerRelatedTools,
  analyzerUseCases,
} from "@/features/actions-analyzer/content/landing-content";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import { siteConfig } from "@/lib/site";

interface SeoContentProps {
  onLoadExample: (sampleId: WorkflowSampleId) => void;
}

export function SeoContent({ onLoadExample }: SeoContentProps) {
  return (
    <section className="space-y-12" data-testid="analyzer-seo-content">
      <div className="space-y-4 rounded-3xl border border-border/80 bg-background/75 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">Developer guide</Badge>
          <Badge tone="subtle">Browser-local workflow review</Badge>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Browser-local GitHub Actions workflow review
          </h2>
          <p className="max-w-4xl text-base leading-7 text-muted-foreground sm:text-lg">
            This page is meant to stay useful to engineers even when the tool is
            not open in another tab. It explains what the analyzer covers, how
            the workflow review loop works, and where the current browser-local
            boundaries are. Browse all tools on{" "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
              href="/"
            >
              the Authos home page
            </Link>{" "}
            or read the{" "}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
              href={siteConfig.privacy.href}
            >
              local processing promise
            </Link>
            .
          </p>
        </div>
      </div>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            What the GitHub Actions analyzer checks
          </h2>
          <p className="max-w-4xl text-base leading-7 text-muted-foreground">
            The analyzer focuses on high-signal review areas that are painful to
            spot in raw YAML diffs and easy to miss during pull request review.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {analyzerCheckAreas.map((item) => (
            <Card key={item.title}>
              <CardHeader>
                <CardTitle className="text-lg">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Common use cases
          </h2>
          <p className="max-w-4xl text-base leading-7 text-muted-foreground">
            Most teams use the analyzer during workflow editing, workflow PR
            review, or post-edit sanity checks on public repositories.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {analyzerUseCases.map((item) => (
            <Card key={item}>
              <CardContent className="px-5 py-5 text-sm leading-6 text-foreground">
                {item}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            How it works
          </h2>
          <p className="max-w-4xl text-base leading-7 text-muted-foreground">
            The workflow stays close to how developers already review CI:
            inspect the YAML, run checks, review findings, then copy results
            into the next step of the pull request.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          {analyzerHowItWorksSteps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <Badge className="w-fit" tone="info">
                  Step {index + 1}
                </Badge>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {step.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Example workflows
          </h2>
          <p className="max-w-4xl text-base leading-7 text-muted-foreground">
            These examples map to real samples in the tool. Loading one scrolls
            back to the workspace and replaces the current input with that
            sample.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {analyzerExampleWorkflows.map((example) => (
            <Card key={example.title}>
              <CardHeader>
                <CardTitle className="text-lg">{example.title}</CardTitle>
                <CardDescription>{example.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  aria-label={`Load this example: ${example.title}`}
                  onClick={() => onLoadExample(example.sampleId)}
                  variant="secondary"
                >
                  Load this example
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            FAQ
          </h2>
          <p className="max-w-4xl text-base leading-7 text-muted-foreground">
            The answers below reflect the current shipped behavior and the
            intentional limits of the browser-local version.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {analyzerFaqItems.map((item) => (
            <Card key={item.question}>
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {item.answer}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Related tools
          </h2>
          <p className="max-w-4xl text-base leading-7 text-muted-foreground">
            Authos is starting with GitHub Actions workflow review and will add
            adjacent config tools later instead of pretending they already
            exist.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {analyzerRelatedTools.map((tool) => (
            <Card key={tool.title}>
              <CardHeader>
                <Badge
                  className="w-fit"
                  tone={tool.status === "available" ? "success" : "subtle"}
                >
                  {tool.status === "available"
                    ? "Available now"
                    : "Coming later"}
                </Badge>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {"href" in tool ? (
                  <Link
                    className="text-sm font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
                    href={tool.href}
                  >
                    Open current tool
                  </Link>
                ) : (
                  <span
                    aria-disabled="true"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Coming later
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}
