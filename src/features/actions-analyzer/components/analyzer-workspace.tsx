import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputPanel } from "@/features/actions-analyzer/components/input-panel";
import { ResultsPanel } from "@/features/actions-analyzer/components/results-panel";
import { WorkspaceToolbar } from "@/features/actions-analyzer/components/workspace-toolbar";
import type { WorkflowSampleId } from "@/features/actions-analyzer/fixtures/samples";
import type {
  WorkflowAnalysisReport,
  WorkflowInputFile,
} from "@/features/actions-analyzer/types";

interface AnalyzerWorkspaceProps {
  activeFile: WorkflowInputFile | null;
  activeFileId: string | null;
  analysisError: string | null;
  autoRunEnabled: boolean;
  canAnalyze: boolean;
  defaultVirtualPath: string;
  errors: string[];
  fileCount: number;
  files: WorkflowInputFile[];
  folderUploadSupported: boolean;
  hasRunnableInput: boolean;
  includeAllYamlFiles: boolean;
  inputText: string;
  isAnalyzing: boolean;
  maxFileSizeLabel: string;
  onAddPasteFile: () => void;
  onAnalyze: () => void;
  onAutoRunChange: (checked: boolean) => void;
  onClear: () => void;
  onClearActiveInput: () => void;
  onFileUpload: (files: FileList | null) => Promise<void>;
  onFileUploadFromFolder: (files: FileList | null) => Promise<void>;
  onInputChange: (value: string) => void;
  onLoadRiskySample: () => void;
  onLoadSelectedSample: () => void;
  onRemoveFile: (fileId: string) => void;
  onRenameFile: (path: string) => void;
  onSampleChange: (sampleId: WorkflowSampleId | "manual") => void;
  onSelectFile: (fileId: string) => void;
  onToggleIncludeAllYamlFiles: (checked: boolean) => void;
  report: WorkflowAnalysisReport | null;
  selectedSampleId: WorkflowSampleId | "manual";
  selectedSampleLabel: string;
  totalSizeLabel: string;
}

export function AnalyzerWorkspace({
  activeFile,
  activeFileId,
  analysisError,
  autoRunEnabled,
  canAnalyze,
  defaultVirtualPath,
  errors,
  fileCount,
  files,
  folderUploadSupported,
  hasRunnableInput,
  includeAllYamlFiles,
  inputText,
  isAnalyzing,
  maxFileSizeLabel,
  onAddPasteFile,
  onAnalyze,
  onAutoRunChange,
  onClear,
  onClearActiveInput,
  onFileUpload,
  onFileUploadFromFolder,
  onInputChange,
  onLoadRiskySample,
  onLoadSelectedSample,
  onRemoveFile,
  onRenameFile,
  onSampleChange,
  onSelectFile,
  onToggleIncludeAllYamlFiles,
  report,
  selectedSampleId,
  selectedSampleLabel,
  totalSizeLabel,
}: AnalyzerWorkspaceProps) {
  return (
    <section
      className="space-y-5 scroll-mt-8"
      data-testid="analyzer-workspace"
      id="analyzer-workspace"
    >
      <WorkspaceToolbar
        activeFileName={activeFile?.path ?? defaultVirtualPath}
        autoRunEnabled={autoRunEnabled}
        canAnalyze={canAnalyze}
        fileCount={fileCount}
        isAnalyzing={isAnalyzing}
        onAnalyze={onAnalyze}
        onAutoRunChange={onAutoRunChange}
        onLoadRiskySample={onLoadRiskySample}
        selectedSampleLabel={selectedSampleLabel}
        totalSizeLabel={totalSizeLabel}
      />

      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <InputPanel
          activeFile={activeFile}
          activeFileId={activeFileId}
          canAnalyze={canAnalyze}
          defaultVirtualPath={defaultVirtualPath}
          errors={errors}
          fileCount={fileCount}
          files={files}
          folderUploadSupported={folderUploadSupported}
          includeAllYamlFiles={includeAllYamlFiles}
          inputText={inputText}
          isAnalyzing={isAnalyzing}
          maxFileSizeLabel={maxFileSizeLabel}
          onAddPasteFile={onAddPasteFile}
          onAnalyze={onAnalyze}
          onClear={onClear}
          onClearActiveInput={onClearActiveInput}
          onFileUpload={onFileUpload}
          onFileUploadFromFolder={onFileUploadFromFolder}
          onInputChange={onInputChange}
          onLoadSelectedSample={onLoadSelectedSample}
          onRemoveFile={onRemoveFile}
          onRenameFile={onRenameFile}
          onSampleChange={onSampleChange}
          onSelectFile={onSelectFile}
          onToggleIncludeAllYamlFiles={onToggleIncludeAllYamlFiles}
          selectedSampleId={selectedSampleId}
          totalSizeLabel={totalSizeLabel}
        />
        <ResultsPanel
          activeFileName={activeFile?.path ?? defaultVirtualPath}
          analysisError={analysisError}
          hasInput={hasRunnableInput}
          isAnalyzing={isAnalyzing}
          report={report}
          selectedSampleLabel={selectedSampleLabel}
          view="all"
        />
      </div>

      <div className="lg:hidden" data-testid="analyzer-mobile-tabs">
        <Tabs defaultValue="input">
          <TabsList aria-label="Analyzer workspace tabs">
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="findings">Findings</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
          </TabsList>

          <TabsContent value="input">
            <InputPanel
              activeFile={activeFile}
              activeFileId={activeFileId}
              canAnalyze={canAnalyze}
              defaultVirtualPath={defaultVirtualPath}
              errors={errors}
              fileCount={fileCount}
              files={files}
              folderUploadSupported={folderUploadSupported}
              includeAllYamlFiles={includeAllYamlFiles}
              inputText={inputText}
              isAnalyzing={isAnalyzing}
              maxFileSizeLabel={maxFileSizeLabel}
              onAddPasteFile={onAddPasteFile}
              onAnalyze={onAnalyze}
              onClear={onClear}
              onClearActiveInput={onClearActiveInput}
              onFileUpload={onFileUpload}
              onFileUploadFromFolder={onFileUploadFromFolder}
              onInputChange={onInputChange}
              onLoadSelectedSample={onLoadSelectedSample}
              onRemoveFile={onRemoveFile}
              onRenameFile={onRenameFile}
              onSampleChange={onSampleChange}
              onSelectFile={onSelectFile}
              onToggleIncludeAllYamlFiles={onToggleIncludeAllYamlFiles}
              selectedSampleId={selectedSampleId}
              totalSizeLabel={totalSizeLabel}
            />
          </TabsContent>
          <TabsContent value="findings">
            <ResultsPanel
              activeFileName={activeFile?.path ?? defaultVirtualPath}
              analysisError={analysisError}
              hasInput={hasRunnableInput}
              isAnalyzing={isAnalyzing}
              report={report}
              selectedSampleLabel={selectedSampleLabel}
              view="findings"
            />
          </TabsContent>
          <TabsContent value="report">
            <ResultsPanel
              activeFileName={activeFile?.path ?? defaultVirtualPath}
              analysisError={analysisError}
              hasInput={hasRunnableInput}
              isAnalyzing={isAnalyzing}
              report={report}
              selectedSampleLabel={selectedSampleLabel}
              view="report"
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
