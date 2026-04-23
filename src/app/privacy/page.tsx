import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Toolbar } from "@/components/ui/toolbar";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Authos tools are designed to keep analysis local in the browser wherever possible.",
};

export default function PrivacyPage() {
  return (
    <Container className="space-y-8 py-16 sm:py-20" data-testid="privacy-page">
      <Toolbar
        data-testid="privacy-toolbar"
        description="Authos tools are designed to keep analysis local in the browser where possible. This page captures the current privacy posture for the GitHub Actions analyzer."
        title="Privacy"
      />

      <Alert
        data-testid="privacy-alert"
        title="Local-first by default"
        tone="info"
      >
        The current product direction avoids login requirements, backend uploads
        for pasted content, and unnecessary data retention. Review the{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
          href={siteConfig.primaryTool.href}
        >
          GitHub Actions analyzer
        </Link>{" "}
        for the current browser-local processing flow.
      </Alert>

      <section className="grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Local browser analysis</CardTitle>
            <CardDescription>
              Tools are designed to run locally in the browser where possible.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            The GitHub Actions analyzer is being built so parsing and inspection
            can stay client-side by default.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pasted content</CardTitle>
            <CardDescription>
              Pasted content for the GitHub Actions analyzer is not uploaded.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Workflow YAML entered directly into the analyzer is intended to stay
            in the user&apos;s browser session. Recent-history metadata can be
            stored locally, but full workflow content remains off by default
            unless the user explicitly enables local content memory.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public GitHub import</CardTitle>
            <CardDescription>
              Public GitHub import is browser-initiated and does not require a
              login.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Public GitHub imports fetch workflow content straight from GitHub in
            the user&apos;s browser without OAuth, backend proxying, or private
            repository support. The analyzer&apos;s local processing promise is
            that pasted YAML stays in the browser unless the user explicitly
            enables on-device content memory in settings.
          </CardContent>
        </Card>
      </section>

      <section className="rounded-3xl border border-border/80 bg-card/85 p-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Use the analyzer with privacy in mind
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          The live{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
            href={siteConfig.primaryTool.href}
          >
            GitHub Actions Workflow Security and Lint Analyzer
          </Link>{" "}
          keeps workflow review browser-local by default, supports optional
          public GitHub imports without login, and avoids storing private YAML
          content in local history unless the user explicitly turns that on for
          this device.
        </p>
      </section>
    </Container>
  );
}
