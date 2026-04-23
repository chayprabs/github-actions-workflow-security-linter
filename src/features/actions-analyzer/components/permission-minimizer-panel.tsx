import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  JobPermissionRecommendation,
  PermissionSummary,
  PermissionScopeRecommendation,
  WorkflowPermissionRecommendation,
} from "@/features/actions-analyzer/types";

export function PermissionMinimizerPanel({
  permissionSummary,
}: {
  permissionSummary: PermissionSummary;
}) {
  if (permissionSummary.workflowRecommendations.length === 0) {
    return (
      <section
        className="rounded-xl border border-border/80 bg-background/70 p-4"
        data-testid="results-permission-minimizer"
      >
        <EmptyState
          description="Authos needs at least one parsed workflow before it can infer a reduced permissions baseline."
          title="Permission minimizer unavailable"
        />
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-border/80 bg-background/70 p-4"
      data-testid="results-permission-minimizer"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">Permission minimizer</Badge>
        <Badge tone="warning">Review recommended</Badge>
        <Badge tone="subtle">
          {permissionSummary.workflowRecommendations.length} workflow
          {permissionSummary.workflowRecommendations.length === 1 ? "" : "s"}
        </Badge>
        <Badge tone="subtle">
          {permissionSummary.jobRecommendations.length} job
          {permissionSummary.jobRecommendations.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">
        Best-effort permission minimizer
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Authos suggests a conservative `contents: read` baseline and then adds
        write scopes only where static workflow signals suggest they may be
        needed. These recommendations are heuristic, not proof, so keep human
        review in the loop before removing access.
      </p>

      <div className="mt-5 space-y-5">
        {permissionSummary.workflowRecommendations.map(
          (workflowRecommendation) => {
            const jobRecommendations =
              permissionSummary.jobRecommendations.filter(
                (recommendation) =>
                  recommendation.filePath === workflowRecommendation.filePath,
              );

            return (
              <WorkflowPermissionSection
                jobRecommendations={jobRecommendations}
                key={workflowRecommendation.filePath}
                workflowRecommendation={workflowRecommendation}
              />
            );
          },
        )}
      </div>
    </section>
  );
}

function WorkflowPermissionSection({
  jobRecommendations,
  workflowRecommendation,
}: {
  jobRecommendations: JobPermissionRecommendation[];
  workflowRecommendation: WorkflowPermissionRecommendation;
}) {
  return (
    <article className="rounded-2xl border border-border/80 bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={getTrustBadgeTone(workflowRecommendation.trustLevel)}>
              {formatTrustLevel(workflowRecommendation.trustLevel)}
            </Badge>
            <Badge tone="subtle">
              {workflowRecommendation.currentWriteScopes.length} current writes
            </Badge>
            <Badge tone="success">
              {formatPermissionMapInline(
                workflowRecommendation.recommendedPermissions,
              )}
            </Badge>
          </div>
          <h4 className="mt-3 text-sm font-semibold text-foreground">
            {workflowRecommendation.workflowName ??
              workflowRecommendation.filePath}
          </h4>
          <p className="mt-2 break-all text-xs leading-5 text-muted-foreground">
            {workflowRecommendation.filePath}
          </p>
        </div>
        <CopyButton
          label="Copy recommended permissions YAML"
          value={workflowRecommendation.copyableYaml}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PermissionCodeBlock
          content={workflowRecommendation.currentPermissionsYaml}
          title="Current top-level permissions"
        />
        <PermissionCodeBlock
          content={workflowRecommendation.copyableYaml}
          title="Suggested reduced permissions"
        />
      </div>

      <ScopeRationaleList
        recommendations={workflowRecommendation.scopeRecommendations}
        title="Top-level rationale"
      />

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <caption className="sr-only">
            Permission minimizer recommendations by job for{" "}
            {workflowRecommendation.filePath}
          </caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <th className="px-3 py-2 font-medium" scope="col">
                Job
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Trigger trust
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Current write scopes
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Third-party actions
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Recommended scopes
              </th>
              <th className="px-3 py-2 font-medium" scope="col">
                Risk label
              </th>
            </tr>
          </thead>
          <tbody>
            {jobRecommendations.map((recommendation) => (
              <tr
                className="rounded-xl border border-border/80 bg-background/80 align-top"
                key={`${recommendation.filePath}:${recommendation.jobId}`}
              >
                <td className="rounded-l-xl px-3 py-3 font-medium text-foreground">
                  {recommendation.jobId}
                </td>
                <td className="px-3 py-3">
                  <Badge tone={getTrustBadgeTone(recommendation.trustLevel)}>
                    {formatTrustLevel(recommendation.trustLevel)}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-foreground">
                  {formatStringList(recommendation.currentWriteScopes)}
                </td>
                <td className="px-3 py-3 text-foreground">
                  {recommendation.thirdPartyActions.length > 0
                    ? `${recommendation.thirdPartyActions.length} present`
                    : "None"}
                </td>
                <td className="px-3 py-3 text-foreground">
                  {formatPermissionMapInline(
                    recommendation.recommendedPermissions,
                  )}
                </td>
                <td className="rounded-r-xl px-3 py-3">
                  <Badge tone={getRiskBadgeTone(recommendation.riskLabel)}>
                    {formatRiskLabel(recommendation.riskLabel)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-3">
        {jobRecommendations.map((recommendation) => (
          <details
            className="rounded-xl border border-border/80 bg-background/70 p-4"
            key={`${recommendation.filePath}:${recommendation.jobId}:details`}
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
              {recommendation.jobId} permissions detail
            </summary>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={getRiskBadgeTone(recommendation.riskLabel)}>
                {formatRiskLabel(recommendation.riskLabel)}
              </Badge>
              <Badge tone="subtle">
                Source:{" "}
                {formatPermissionsSource(
                  recommendation.currentPermissionsSource,
                )}
              </Badge>
              <Badge tone={getTrustBadgeTone(recommendation.trustLevel)}>
                {formatTrustLevel(recommendation.trustLevel)}
              </Badge>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <PermissionCodeBlock
                content={recommendation.currentPermissionsYaml}
                title="Current job permissions"
              />
              <PermissionCodeBlock
                content={recommendation.copyableYaml}
                title="Suggested job YAML"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton
                label="Copy job permissions YAML"
                value={recommendation.copyableYaml}
              />
              {recommendation.thirdPartyActions.length > 0 ? (
                <Badge tone="warning">
                  Third-party actions: {recommendation.thirdPartyActions.length}
                </Badge>
              ) : null}
            </div>

            <ScopeRationaleList
              recommendations={recommendation.scopeRecommendations}
              title="Why each write scope may or may not be needed"
            />

            {recommendation.thirdPartyActions.length > 0 ? (
              <div className="mt-4 rounded-xl border border-border/80 bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Third-party actions present
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recommendation.thirdPartyActions.map((action) => (
                    <Badge key={action} tone="subtle">
                      {action}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </details>
        ))}
      </div>
    </article>
  );
}

function PermissionCodeBlock({
  content,
  title,
}: {
  content: string | null;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-border/70 bg-card/80 p-3 text-xs leading-6 text-foreground">
        {content ?? "Not declared"}
      </pre>
    </div>
  );
}

function ScopeRationaleList({
  recommendations,
  title,
}: {
  recommendations: PermissionScopeRecommendation[];
  title: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-border/80 bg-background/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </p>
      <div className="mt-3 space-y-2">
        {recommendations.map((recommendation) => (
          <div
            className="rounded-lg border border-border/70 bg-card/80 p-3"
            key={`${recommendation.scope}:${recommendation.recommendedAccess}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                tone={
                  recommendation.recommendedAccess === "write"
                    ? "warning"
                    : recommendation.recommendedAccess === "read"
                      ? "success"
                      : "subtle"
                }
              >
                {recommendation.scope}: {recommendation.recommendedAccess}
              </Badge>
              <Badge tone="subtle">
                Current: {recommendation.currentAccess ?? "none"}
              </Badge>
              <Badge
                tone={
                  recommendation.status === "review-recommended"
                    ? "warning"
                    : "subtle"
                }
              >
                {recommendation.status === "review-recommended"
                  ? "Review recommended"
                  : "No strong signal"}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-foreground">
              {recommendation.rationale}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPermissionMapInline(
  permissions: Record<string, "read" | "write">,
) {
  const entries = Object.entries(permissions).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return entries.map(([scope, access]) => `${scope}: ${access}`).join(", ");
}

function formatPermissionsSource(
  source: JobPermissionRecommendation["currentPermissionsSource"],
) {
  switch (source) {
    case "job":
      return "Job override";
    case "top-level":
      return "Inherited top-level";
    case "none":
    default:
      return "Not declared";
  }
}

function formatRiskLabel(riskLabel: JobPermissionRecommendation["riskLabel"]) {
  switch (riskLabel) {
    case "high":
      return "Higher review risk";
    case "review":
      return "Review";
    case "low":
    default:
      return "Lower risk";
  }
}

function getRiskBadgeTone(riskLabel: JobPermissionRecommendation["riskLabel"]) {
  switch (riskLabel) {
    case "high":
      return "danger";
    case "review":
      return "warning";
    case "low":
    default:
      return "success";
  }
}

function formatTrustLevel(
  trustLevel: WorkflowPermissionRecommendation["trustLevel"],
) {
  switch (trustLevel) {
    case "privileged-follow-up":
      return "Privileged follow-up";
    case "mixed":
      return "Mixed trust";
    case "untrusted":
      return "Untrusted trigger";
    case "trusted":
    default:
      return "Trusted trigger";
  }
}

function getTrustBadgeTone(
  trustLevel: WorkflowPermissionRecommendation["trustLevel"],
) {
  switch (trustLevel) {
    case "untrusted":
      return "danger";
    case "mixed":
    case "privileged-follow-up":
      return "warning";
    case "trusted":
    default:
      return "success";
  }
}

function formatStringList(values: string[]) {
  return values.length > 0 ? values.join(", ") : "None";
}
