import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="flex flex-col items-start gap-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="max-w-xl text-muted-foreground">
        This site focuses on the GitHub Actions workflow analyzer. Return to the
        home page to paste or upload workflow YAML.
      </p>
      <Link className={buttonVariants()} href="/">
        Back to analyzer
      </Link>
    </Container>
  );
}
