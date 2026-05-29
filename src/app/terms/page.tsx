import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms and conditions for using the GHA Workflow Analyzer browser tool.",
};

export default function TermsPage() {
  return (
    <Container className="max-w-3xl space-y-8 py-12 sm:py-16" data-testid="terms-page">
      <header className="space-y-2" data-testid="terms-toolbar">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-muted-foreground">
          Last updated: May 29, 2026
        </p>
      </header>

      <div className="space-y-6 text-sm leading-7 text-muted-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground">
            1. Acceptance
          </h2>
          <p className="mt-2">
            By using {siteConfig.name} (the &quot;Service&quot;), you agree to
            these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            2. What the Service provides
          </h2>
          <p className="mt-2">
            The Service is a browser-based tool that analyzes GitHub Actions
            workflow YAML locally when possible. Outputs are advisory static
            analysis results, not guarantees of security or correctness. You are
            responsible for reviewing findings before acting on them.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            3. No warranties
          </h2>
          <p className="mt-2">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
            WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING
            IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
            PURPOSE, AND NON-INFRINGEMENT. We do not warrant that the Service will
            be error-free, complete, or suitable for your environment.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            4. Limitation of liability
          </h2>
          <p className="mt-2">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR OF THIS SERVICE
            AND ITS CONTRIBUTORS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
            DATA, GOODWILL, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF OR
            INABILITY TO USE THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF
            SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE
            SERVICE WILL NOT EXCEED USD $100.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            5. Your responsibilities
          </h2>
          <p className="mt-2">
            You will not misuse the Service, attempt to disrupt it, or use it in
            violation of applicable law. Do not submit unlawful content. You
            remain responsible for secrets, credentials, and sensitive data in
            workflow files you paste or upload.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            6. Third-party services
          </h2>
          <p className="mt-2">
            Optional public GitHub import features fetch data directly from
            GitHub in your browser. Your use of GitHub is subject to
            GitHub&apos;s terms and policies.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            7. Changes
          </h2>
          <p className="mt-2">
            We may update these Terms. Continued use after changes are posted
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">
            8. Governing law
          </h2>
          <p className="mt-2">
            These Terms are governed by the laws of India, without regard to
            conflict-of-law rules. Courts in India will have exclusive
            jurisdiction, except where mandatory consumer protection laws in your
            country require otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Contact</h2>
          <p className="mt-2">
            Questions about these Terms may be directed via the contact options on{" "}
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
        See also the{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:text-accent hover:underline"
          href={siteConfig.privacy.href}
        >
          Privacy Policy
        </Link>
        .
      </p>
    </Container>
  );
}
