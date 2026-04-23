import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AttackPath } from "@/features/actions-analyzer/types";

export function AttackPathPanel({
  attackPaths,
}: {
  attackPaths: AttackPath[];
}) {
  return (
    <section
      className="rounded-xl border border-border/80 bg-background/70 p-4"
      data-testid="results-attack-paths"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">Attack paths</Badge>
        <Badge tone="warning">Static heuristics</Badge>
        <Badge tone="subtle">
          {attackPaths.length} path{attackPaths.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">
        Combined-risk explanations
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        These paths are derived from static workflow structure plus enabled
        findings. They explain how separate issues could connect, but they do
        not prove exploitability or account for repository settings outside the
        YAML file.
      </p>

      {attackPaths.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            description="Authos did not find a high-confidence chain from the enabled rules in this workflow set."
            title="No high-confidence attack paths detected by enabled rules."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {attackPaths.map((attackPath) => (
            <article
              className="rounded-2xl border border-border/80 bg-card/70 p-4"
              key={attackPath.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={getSeverityBadgeTone(attackPath.severity)}>
                      {attackPath.severity}
                    </Badge>
                    <Badge tone="subtle">
                      {attackPath.relatedRuleIds.join(", ")}
                    </Badge>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-foreground">
                    {attackPath.title}
                  </h4>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-foreground">
                {attackPath.description}
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border/80 bg-background/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Affected scope
                  </p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                    <PathDetailLine
                      label="Files"
                      value={formatStringList(attackPath.filePaths)}
                    />
                    <PathDetailLine
                      label="Jobs"
                      value={formatStringList(attackPath.jobIds)}
                    />
                    <PathDetailLine
                      label="Steps"
                      value={formatStringList(attackPath.stepLabels)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Mitigation checklist
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-foreground">
                    {attackPath.mitigationChecklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border/80 bg-background/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Why this combination matters
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {attackPath.heuristic}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function PathDetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/80 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[22rem] text-right">{value}</span>
    </div>
  );
}

function getSeverityBadgeTone(severity: AttackPath["severity"]) {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "severity-high";
    case "medium":
      return "severity-medium";
    case "low":
      return "severity-low";
    case "info":
    default:
      return "info";
  }
}

function formatStringList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "None";
}
