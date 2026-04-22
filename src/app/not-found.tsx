import Link from "next/link";
import { Compass, Home, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site";

export default function NotFound() {
  return (
    <Container className="flex min-h-[calc(100vh-13rem)] items-center py-16">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <Badge tone="subtle" className="w-fit">
            404
          </Badge>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <SearchX className="h-6 w-6" />
          </div>
          <CardTitle className="text-3xl">
            That route does not exist yet.
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            The Authos workspace is currently focused on the GitHub Actions
            analyzer foundation. Head back home or jump directly into the first
            tool route.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/" className={buttonVariants()}>
              <Home className="h-4 w-4" />
              Return home
            </Link>
            <Link
              href={siteConfig.primaryTool.href}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Compass className="h-4 w-4" />
              Open first tool
            </Link>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
