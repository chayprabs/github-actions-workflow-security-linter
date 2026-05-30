import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for the GHA Workflow Analyzer browser tool.",
};

export default function PrivacyPage() {
  return (
    <Container
      className="max-w-3xl space-y-8 py-12 sm:py-16"
      data-testid="privacy-page"
    >
      <header className="space-y-2" data-testid="privacy-toolbar">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: May 29, 2026
        </p>
      </header>

      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground">Summary</h2>
          <p className="mt-2">
            {siteConfig.name} is designed for local, browser-first workflow
            analysis. Pasted and uploaded workflow YAML is processed in your
            browser and is not uploaded to our servers because we do not operate
            a backend that receives that content.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Data we do not collect
          </h2>
          <p className="mt-2">
            We do not require login for the core analyzer. We do not sell
            workflow content, run advertising trackers on the analyzer surface,
            or operate a database that stores your pasted YAML by default.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Local storage on your device
          </h2>
          <p className="mt-2">
            The app may store analyzer preferences, optional analysis history
            metadata, and—only if you explicitly enable it—workflow content in
            your browser&apos;s local storage. You can clear this data from your
            browser or through in-app settings where available.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Public GitHub import
          </h2>
          <p className="mt-2">
            When you import a public workflow, your browser contacts GitHub
            directly. That request is subject to GitHub&apos;s privacy policy
            and rate limits. We do not proxy private repositories or ask for
            OAuth tokens in the current product.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            Hosting and logs
          </h2>
          <p className="mt-2">
            If you access the deployed website, your hosting provider or CDN may
            process standard web server logs (such as IP address, user agent,
            and requested path) according to their policies. We do not use those
            logs to reconstruct workflow file contents from analyzer usage.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p className="mt-2">
            Privacy questions may be directed via{" "}
            <a
              className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
              href={siteConfig.personalWebsiteUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {siteConfig.personalWebsiteUrl}
            </a>
            .
          </p>
        </section>
      </div>

      <p className="text-sm text-muted-foreground">
        Return to the{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
          href={siteConfig.primaryTool.href}
        >
          analyzer
        </Link>{" "}
        or read the{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
          href={siteConfig.terms.href}
        >
          Terms &amp; Conditions
        </Link>
        .
      </p>
    </Container>
  );
}
