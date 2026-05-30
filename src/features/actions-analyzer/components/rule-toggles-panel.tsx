"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ruleCatalog } from "@/features/actions-analyzer/lib/rule-catalog";
import type {
  FindingCategory,
  RuleDefinition,
} from "@/features/actions-analyzer/types";

interface RuleTogglesPanelProps {
  disabledRuleIds: string[];
  onChange: (nextDisabledRuleIds: string[]) => void;
}

export function RuleTogglesPanel({
  disabledRuleIds,
  onChange,
}: RuleTogglesPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const disabledSet = useMemo(
    () => new Set(disabledRuleIds),
    [disabledRuleIds],
  );

  const groupedRules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ruleCatalog
      .filter((rule) => {
        if (query.length === 0) {
          return true;
        }

        return (
          rule.id.toLowerCase().includes(query) ||
          rule.title.toLowerCase().includes(query) ||
          rule.category.toLowerCase().includes(query)
        );
      })
      .reduce<Partial<Record<FindingCategory, RuleDefinition[]>>>(
        (groups, rule) => {
          const current = groups[rule.category] ?? [];
          groups[rule.category] = [...current, rule];
          return groups;
        },
        {},
      );
  }, [searchQuery]);

  return (
    <section className="space-y-3 rounded-2xl border border-border/80 bg-background/70 p-4">
      <PanelHeader
        description="Disabled rules stay off until you re-enable them."
        title="Rule toggles"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => onChange([])}
          size="sm"
          type="button"
          variant="secondary"
        >
          Enable all rules
        </Button>
        <Button
          onClick={() => onChange(ruleCatalog.map((rule) => rule.id))}
          size="sm"
          type="button"
          variant="ghost"
        >
          Disable all rules
        </Button>
      </div>
      <Input
        aria-label="Search rules"
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search by rule id, title, or category"
        value={searchQuery}
      />
      <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
        {Object.entries(groupedRules).map(([category, rules]) => (
          <div className="space-y-2" key={category}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {category}
            </p>
            <div className="space-y-2">
              {rules?.map((rule) => (
                <RuleToggleRow
                  disabledRuleIds={disabledRuleIds}
                  enabled={!disabledSet.has(rule.id)}
                  key={rule.id}
                  onChange={onChange}
                  rule={rule}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RuleToggleRow({
  disabledRuleIds,
  enabled,
  onChange,
  rule,
}: {
  disabledRuleIds: string[];
  enabled: boolean;
  onChange: (nextDisabledRuleIds: string[]) => void;
  rule: RuleDefinition;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-card/70 px-3 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {rule.id} · {rule.title}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          {rule.description}
        </p>
      </div>
      <Switch
        aria-label={`Enable ${rule.id}`}
        checked={enabled}
        className="mt-0.5"
        onCheckedChange={(checked) => {
          if (checked) {
            onChange(disabledRuleIds.filter((ruleId) => ruleId !== rule.id));
            return;
          }

          onChange([...disabledRuleIds, rule.id]);
        }}
      />
    </div>
  );
}

function PanelHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
