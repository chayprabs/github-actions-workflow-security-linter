import type { Metadata } from "next";

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
        for pasted content, and unnecessary data retention.
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
            in the user&apos;s browser session.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Future public GitHub import</CardTitle>
            <CardDescription>
              Public GitHub import will be browser-initiated when implemented
              later.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            Public GitHub import, when implemented later, will fetch public
            GitHub data directly from the user&apos;s browser.
          </CardContent>
        </Card>
      </section>
    </Container>
  );
}
