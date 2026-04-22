import { Activity, FileCode2, FlaskConical, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface WorkspaceToolbarProps {
  activeFileName: string;
  autoRunEnabled: boolean;
  canAnalyze: boolean;
  fileCount: number;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  onAutoRunChange: (checked: boolean) => void;
  onLoadRiskySample: () => void;
  selectedSampleLabel: string;
  totalSizeLabel: string;
}

export function WorkspaceToolbar({
  activeFileName,
  autoRunEnabled,
  canAnalyze,
  fileCount,
  isAnalyzing,
  onAnalyze,
  onAutoRunChange,
  onLoadRiskySample,
  selectedSampleLabel,
  totalSizeLabel,
}: WorkspaceToolbarProps) {
  return (
    <Card
      className="sticky top-4 z-10 border-border/90 bg-background/95 px-4 py-3 backdrop-blur"
      data-testid="workspace-toolbar"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">
            <FileCode2 className="h-3.5 w-3.5" />
            {activeFileName}
          </Badge>
          <Badge tone="subtle">
            <FlaskConical className="h-3.5 w-3.5" />
            {selectedSampleLabel}
          </Badge>
          <Badge tone="subtle">
            <FileCode2 className="h-3.5 w-3.5" />
            {fileCount} {fileCount === 1 ? "file" : "files"} · {totalSizeLabel}
          </Badge>
          <Badge tone={isAnalyzing ? "warning" : "success"}>
            <Activity className="h-3.5 w-3.5" />
            {isAnalyzing ? "Analyzing locally" : "Local analyzer ready"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-2">
            <Switch
              aria-label="Auto-run analysis"
              checked={autoRunEnabled}
              onCheckedChange={onAutoRunChange}
            />
            <span className="text-sm text-muted-foreground">Auto-run</span>
          </div>
          <Button onClick={onLoadRiskySample} variant="secondary">
            Load risky sample
          </Button>
          <Button disabled={!canAnalyze} onClick={onAnalyze}>
            <Play className="h-4 w-4" />
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
