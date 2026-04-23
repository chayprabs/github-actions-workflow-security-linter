"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OverlayPanel } from "@/components/ui/overlay-panel";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { AnalyzerWorkspacePreferences } from "@/features/actions-analyzer/lib/analyzer-preferences";

interface AnalyzerSettingsDrawerProps {
  onChange: (
    updater: (
      current: AnalyzerWorkspacePreferences,
    ) => AnalyzerWorkspacePreferences,
  ) => void;
  onClose: () => void;
  onReset: () => void;
  open: boolean;
  preferences: AnalyzerWorkspacePreferences;
}

const profileOptions: Array<{
  description: string;
  label: string;
  value: AnalyzerWorkspacePreferences["analyzer"]["profile"];
}> = [
  {
    description: "Balanced defaults for everyday pull request review.",
    label: "Balanced",
    value: "balanced",
  },
  {
    description: "Stricter security posture with fewer risky allowances.",
    label: "Strict security",
    value: "strict-security",
  },
  {
    description: "Opinionated checks for public and community-facing repos.",
    label: "Open source",
    value: "open-source",
  },
  {
    description:
      "Conservative defaults for private internal application repos.",
    label: "Private app",
    value: "private-app",
  },
  {
    description: "Release-focused review posture for deployment workflows.",
    label: "Deploy release",
    value: "deploy-release",
  },
];

export function AnalyzerSettingsDrawer({
  onChange,
  onClose,
  onReset,
  open,
  preferences,
}: AnalyzerSettingsDrawerProps) {
  return (
    <OverlayPanel
      description="These preferences stay on this device. Workflow content is not saved to local history unless you turn that on explicitly."
      onClose={onClose}
      open={open}
      title="Analyzer settings"
      variant="drawer"
    >
      <div className="space-y-6">
        <section className="space-y-3 rounded-2xl border border-border/80 bg-background/70 p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Review profile
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Pick the default review posture you want when the page loads.
            </p>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">Profile</span>
            <Select
              aria-label="Analyzer profile"
              onChange={(event) => {
                const nextProfile = event.target
                  .value as AnalyzerWorkspacePreferences["analyzer"]["profile"];

                onChange((current) => ({
                  ...current,
                  analyzer: {
                    ...current.analyzer,
                    profile: nextProfile,
                  },
                }));
              }}
              value={preferences.analyzer.profile}
            >
              {profileOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <p className="text-sm text-muted-foreground">
            {
              profileOptions.find(
                (option) => option.value === preferences.analyzer.profile,
              )?.description
            }
          </p>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/80 bg-background/70 p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Security checks
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Tune the rules that shape warnings and scoring.
            </p>
          </div>
          <SettingsSwitchRow
            checked={preferences.analyzer.requireShaPinning}
            description="Warn when action references are not pinned to an immutable full SHA."
            label="Require full SHA pinning"
            onCheckedChange={(checked) => {
              onChange((current) => ({
                ...current,
                analyzer: {
                  ...current.analyzer,
                  requireShaPinning: checked,
                },
              }));
            }}
          />
          <SettingsSwitchRow
            checked={preferences.analyzer.warnOnMissingTopLevelPermissions}
            description="Flag workflows that do not declare a top-level permissions baseline."
            label="Warn on missing top-level permissions"
            onCheckedChange={(checked) => {
              onChange((current) => ({
                ...current,
                analyzer: {
                  ...current.analyzer,
                  warnOnMissingTopLevelPermissions: checked,
                },
              }));
            }}
          />
          <SettingsSwitchRow
            checked={preferences.analyzer.allowSelfHostedOnPullRequest}
            description="Turn this on only if self-hosted runners are acceptable on pull request-triggered workflows."
            label="Allow self-hosted runners on PRs"
            onCheckedChange={(checked) => {
              onChange((current) => ({
                ...current,
                analyzer: {
                  ...current.analyzer,
                  allowSelfHostedOnPullRequest: checked,
                },
              }));
            }}
          />
          <SettingsSwitchRow
            checked={preferences.analyzer.detectSecretsInInput}
            description="Scan pasted, uploaded, and imported content for likely secret material."
            label="Detect secrets in input"
            onCheckedChange={(checked) => {
              onChange((current) => ({
                ...current,
                analyzer: {
                  ...current.analyzer,
                  detectSecretsInInput: checked,
                },
              }));
            }}
          />
          <label className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              Max matrix combinations before warning
            </span>
            <Input
              aria-label="Max matrix combinations before warning"
              inputMode="numeric"
              min={1}
              onChange={(event) => {
                const nextValue = Number(event.target.value);

                onChange((current) => ({
                  ...current,
                  analyzer: {
                    ...current.analyzer,
                    maxMatrixCombinationsBeforeWarning:
                      Number.isNaN(nextValue) || nextValue < 1
                        ? 1
                        : Math.round(nextValue),
                  },
                }));
              }}
              type="number"
              value={preferences.analyzer.maxMatrixCombinationsBeforeWarning}
            />
            <p className="text-sm text-muted-foreground">
              Larger matrices stay previewable, but Authos starts warning after
              this threshold.
            </p>
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-border/80 bg-background/70 p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Workspace behavior
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              These are purely local UX preferences for this device.
            </p>
          </div>
          <SettingsSwitchRow
            checked={preferences.ui.autoRunAnalysis}
            description="Run analysis automatically after input changes settle."
            label="Auto-run analysis"
            onCheckedChange={(checked) => {
              onChange((current) => ({
                ...current,
                ui: {
                  ...current.ui,
                  autoRunAnalysis: checked,
                },
              }));
            }}
          />
          <SettingsSwitchRow
            checked={preferences.ui.softWrapEditor}
            description="Wrap long lines in the editor instead of forcing horizontal scrolling."
            label="Soft wrap editor"
            onCheckedChange={(checked) => {
              onChange((current) => ({
                ...current,
                ui: {
                  ...current.ui,
                  softWrapEditor: checked,
                },
              }));
            }}
          />
          <SettingsSwitchRow
            checked={preferences.ui.rememberWorkflowContent}
            description="Save workflow YAML in local history so you can reopen it later on this device."
            label="Remember workflow content on this device"
            onCheckedChange={(checked) => {
              onChange((current) => ({
                ...current,
                ui: {
                  ...current.ui,
                  rememberWorkflowContent: checked,
                },
              }));
            }}
          />
          <Alert title="Private content warning" tone="warning">
            Leaving content history off keeps pasted and uploaded workflow YAML
            out of local history. Turning it on stores workflow content in this
            browser&apos;s local storage on this device.
          </Alert>
        </section>

        <div className="flex flex-wrap justify-between gap-3">
          <Button onClick={onReset} variant="ghost">
            Reset settings
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </OverlayPanel>
  );
}

function SettingsSwitchRow({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-card/70 px-3 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        className="mt-0.5"
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
