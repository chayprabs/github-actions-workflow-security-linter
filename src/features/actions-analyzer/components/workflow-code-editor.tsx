"use client";

import {
  Compartment,
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { yaml } from "@codemirror/lang-yaml";
import {
  type Diagnostic,
  lintGutter,
  lintKeymap,
  setDiagnostics,
} from "@codemirror/lint";
import {
  highlightSelectionMatches,
  openSearchPanel,
  search,
  searchKeymap,
} from "@codemirror/search";
import {
  Decoration,
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  scrollPastEnd,
} from "@codemirror/view";
import { Download, Search } from "lucide-react";
import {
  type ChangeEvent,
  type FocusEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/textarea";
import {
  getSeverityTone,
  severityDisplayOrder,
} from "@/features/actions-analyzer/lib/finding-presentation";
import {
  formatBytes,
  getFileSizeBytes,
  normalizeWorkflowPath,
} from "@/features/actions-analyzer/lib/workflow-input-utils";
import type {
  AnalyzerFinding,
  Severity,
  SourceLocation,
} from "@/features/actions-analyzer/types";

const editorFallbackThresholdBytes = 1024 * 1024;
const setActiveLineEffect = StateEffect.define<number | null>();
const activeLineField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    let nextDecorations = decorations.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (!effect.is(setActiveLineEffect)) {
        continue;
      }

      if (effect.value === null) {
        return Decoration.none;
      }

      const line = transaction.state.doc.lineAt(effect.value);
      nextDecorations = Decoration.set([
        Decoration.line({
          attributes: {
            class: "cm-authos-active-finding-line",
          },
        }).range(line.from),
      ]);
    }

    return nextDecorations;
  },
  provide(field) {
    return EditorView.decorations.from(field);
  },
});

const editorTheme = EditorView.theme({
  "&": {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border) / 0.8)",
    borderRadius: "var(--radius-md)",
    color: "hsl(var(--foreground))",
    fontFamily:
      'ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: "0.925rem",
    overflow: "hidden",
  },
  ".cm-activeLine": {
    backgroundColor: "hsl(var(--accent) / 0.05)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "hsl(var(--accent) / 0.06)",
    color: "hsl(var(--foreground))",
  },
  ".cm-authos-active-finding-line": {
    backgroundColor: "hsl(var(--warning) / 0.16)",
  },
  ".cm-authos-diagnostic-error": {
    backgroundColor: "hsl(var(--danger) / 0.12)",
    textDecorationColor: "hsl(var(--danger))",
  },
  ".cm-authos-diagnostic-info": {
    backgroundColor: "hsl(var(--info) / 0.12)",
    textDecorationColor: "hsl(var(--info))",
  },
  ".cm-authos-diagnostic-warning": {
    backgroundColor: "hsl(var(--warning) / 0.16)",
    textDecorationColor: "hsl(var(--warning))",
  },
  ".cm-content": {
    caretColor: "hsl(var(--accent))",
    minHeight: "24rem",
    padding: "0.85rem 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "hsl(var(--accent))",
  },
  ".cm-diagnostic": {
    borderRadius: "0.75rem",
    borderWidth: "1px",
    color: "hsl(var(--foreground))",
    padding: "0.75rem 0.85rem",
  },
  ".cm-diagnostic-error": {
    backgroundColor: "hsl(var(--danger) / 0.08)",
    borderColor: "hsl(var(--danger) / 0.22)",
  },
  ".cm-diagnostic-info": {
    backgroundColor: "hsl(var(--info) / 0.08)",
    borderColor: "hsl(var(--info) / 0.22)",
  },
  ".cm-diagnostic-warning": {
    backgroundColor: "hsl(var(--warning) / 0.1)",
    borderColor: "hsl(var(--warning) / 0.22)",
  },
  ".cm-diagnosticAction": {
    borderRadius: "0.5rem",
  },
  ".cm-diagnosticText": {
    whiteSpace: "pre-wrap",
  },
  ".cm-editor.cm-focused": {
    outline: "2px solid hsl(var(--accent) / 0.24)",
    outlineOffset: "2px",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "hsl(var(--muted))",
    border: "none",
    color: "hsl(var(--muted-foreground))",
  },
  ".cm-gutters": {
    backgroundColor: "hsl(var(--background) / 0.72)",
    borderRight: "1px solid hsl(var(--border) / 0.7)",
    color: "hsl(var(--muted-foreground))",
  },
  ".cm-line": {
    padding: "0 1rem",
  },
  ".cm-lint-marker-error": {
    color: "hsl(var(--danger))",
  },
  ".cm-lint-marker-info": {
    color: "hsl(var(--info))",
  },
  ".cm-lint-marker-warning": {
    color: "hsl(var(--warning))",
  },
  ".cm-matchingBracket": {
    backgroundColor: "hsl(var(--accent) / 0.12)",
    color: "hsl(var(--foreground))",
  },
  ".cm-panels": {
    backgroundColor: "hsl(var(--card))",
    borderBottom: "1px solid hsl(var(--border) / 0.8)",
    color: "hsl(var(--foreground))",
  },
  ".cm-panels .cm-button": {
    backgroundColor: "hsl(var(--accent))",
    border: "none",
    borderRadius: "0.5rem",
    color: "hsl(var(--accent-foreground))",
  },
  ".cm-panels .cm-button:hover": {
    backgroundColor: "hsl(var(--accent) / 0.9)",
  },
  ".cm-panels input": {
    backgroundColor: "hsl(var(--background))",
    border: "1px solid hsl(var(--input))",
    borderRadius: "0.5rem",
    color: "hsl(var(--foreground))",
  },
  ".cm-scroller": {
    overflow: "auto",
  },
  ".cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "hsl(var(--accent) / 0.18) !important",
  },
  ".cm-searchMatch": {
    backgroundColor: "hsl(var(--warning) / 0.16)",
    outline: "1px solid hsl(var(--warning) / 0.34)",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "hsl(var(--warning) / 0.26)",
  },
  ".cm-tooltip": {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border) / 0.8)",
    borderRadius: "0.9rem",
    color: "hsl(var(--foreground))",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "hsl(var(--accent) / 0.14)",
    color: "hsl(var(--foreground))",
  },
  ".cm-ySelectionInfo": {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border) / 0.8)",
  },
  ".cm-authos-diagnostic-body": {
    display: "grid",
    gap: "0.45rem",
  },
  ".cm-authos-diagnostic-copy": {
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.8125rem",
    lineHeight: "1.45",
  },
  ".cm-authos-diagnostic-rule": {
    color: "hsl(var(--foreground))",
    fontSize: "0.75rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  ".cm-authos-diagnostic-title": {
    color: "hsl(var(--foreground))",
    fontSize: "0.875rem",
    fontWeight: "700",
    lineHeight: "1.35",
  },
});

export interface WorkflowEditorJumpTarget {
  column: number;
  endColumn?: number | undefined;
  endLine?: number | undefined;
  filePath: string;
  findingId: string;
  line: number;
  sequence: number;
}

interface WorkflowCodeEditorProps {
  activeFinding: AnalyzerFinding | null;
  diagnostics: AnalyzerFinding[];
  filePath: string;
  jumpTarget: WorkflowEditorJumpTarget | null;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export function WorkflowCodeEditor({
  activeFinding,
  diagnostics,
  filePath,
  jumpTarget,
  label,
  onChange,
  value,
}: WorkflowCodeEditorProps) {
  const textareaId = useId();
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const fallbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const onChangeRef = useRef(onChange);
  const lastHandledJumpRef = useRef<number | null>(null);
  const applyingExternalValueRef = useRef(false);
  const wrapCompartmentRef = useRef(new Compartment());
  const [softWrapEnabled, setSoftWrapEnabled] = useState(true);
  const [preferTextarea, setPreferTextarea] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const fileSizeBytes = getFileSizeBytes(value);
  const exceedsEditorThreshold = fileSizeBytes > editorFallbackThresholdBytes;
  const canUseCodeEditor = !exceedsEditorThreshold && !preferTextarea;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!canUseCodeEditor) {
      editorView?.destroy();
      editorViewRef.current = null;
      return;
    }

    if (editorView || !editorContainerRef.current) {
      return;
    }

    try {
      const editorViewInstance = new EditorView({
        doc: "",
        extensions: [
          EditorState.tabSize.of(2),
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          drawSelection(),
          highlightActiveLine(),
          search({
            top: true,
          }),
          highlightSelectionMatches(),
          yaml(),
          lintGutter(),
          scrollPastEnd(),
          keymap.of([...searchKeymap, ...lintKeymap]),
          activeLineField,
          wrapCompartmentRef.current.of(EditorView.lineWrapping),
          EditorView.contentAttributes.of({
            "aria-label": label,
            autocapitalize: "off",
            autocomplete: "off",
            autocorrect: "off",
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || applyingExternalValueRef.current) {
              return;
            }

            onChangeRef.current(update.state.doc.toString());
          }),
          editorTheme,
        ],
        parent: editorContainerRef.current,
      });

      editorViewRef.current = editorViewInstance;

      return () => {
        editorViewInstance.destroy();
        editorViewRef.current = null;
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "The code editor could not initialize in this browser.";
      const timeoutId = window.setTimeout(() => {
        setEditorError(errorMessage);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }
  }, [canUseCodeEditor, label]);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView) {
      return;
    }

    editorView.dispatch({
      effects: wrapCompartmentRef.current.reconfigure(
        softWrapEnabled ? EditorView.lineWrapping : [],
      ),
    });
  }, [softWrapEnabled]);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView) {
      return;
    }

    const currentValue = editorView.state.doc.toString();

    if (currentValue === value) {
      return;
    }

    applyingExternalValueRef.current = true;
    editorView.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
    });
    applyingExternalValueRef.current = false;
  }, [value]);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView) {
      return;
    }

    syncEditorDiagnostics(editorView, diagnostics);
  }, [diagnostics]);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (editorView) {
      syncActiveFindingHighlight(editorView, activeFinding?.location);
      return;
    }

    if (!activeFinding?.location || !fallbackTextareaRef.current) {
      return;
    }

    const targetRange = getDocumentRange(
      value,
      activeFinding.location.line,
      activeFinding.location.column,
      activeFinding.location.endLine,
      activeFinding.location.endColumn,
    );

    fallbackTextareaRef.current.setSelectionRange(
      targetRange.from,
      targetRange.to,
    );
  }, [activeFinding, value]);

  useEffect(() => {
    focusEditorJumpTarget(
      filePath,
      jumpTarget,
      activeFinding,
      value,
      editorViewRef.current,
      fallbackTextareaRef.current,
      lastHandledJumpRef,
    );
  }, [activeFinding, filePath, jumpTarget, value]);

  function handleSearch() {
    const editorView = editorViewRef.current;

    if (!editorView) {
      return;
    }

    editorView.focus();
    openSearchPanel(editorView);
  }

  function handleSelectAll() {
    const editorView = editorViewRef.current;

    if (editorView) {
      editorView.focus();
      editorView.dispatch({
        selection: EditorSelection.range(0, editorView.state.doc.length),
      });
      return;
    }

    fallbackTextareaRef.current?.focus();
    fallbackTextareaRef.current?.setSelectionRange(0, value.length);
  }

  function handleDownload() {
    if (typeof window === "undefined") {
      return;
    }

    const nextFileName = getDownloadFileName(filePath);
    const blob = new Blob([value], {
      type: "text/plain;charset=utf-8",
    });
    const blobUrl = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");

    link.download = nextFileName;
    link.href = blobUrl;
    window.document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  }

  function handleTextareaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value);
  }

  function handleTextareaFocus(event: FocusEvent<HTMLTextAreaElement>) {
    if (!activeFinding?.location) {
      return;
    }

    const nextRange = getDocumentRange(
      value,
      activeFinding.location.line,
      activeFinding.location.column,
      activeFinding.location.endLine,
      activeFinding.location.endColumn,
    );

    event.currentTarget.setSelectionRange(nextRange.from, nextRange.to);
  }

  const isFallbackMode = !canUseCodeEditor || editorError !== null;

  return (
    <div className="space-y-3" data-testid="workflow-code-editor">
      {exceedsEditorThreshold ? (
        <Alert title="Large input fallback" tone="warning">
          This file is {formatBytes(fileSizeBytes)}. Authos is using the plain
          textarea to avoid sluggish editor behavior above 1 MB.
        </Alert>
      ) : null}

      {editorError ? (
        <Alert title="Editor fallback" tone="warning">
          CodeMirror could not initialize cleanly, so Authos kept the resilient
          textarea available instead.
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/80 bg-background/70 p-2">
        <Button
          disabled={isFallbackMode}
          onClick={handleSearch}
          size="sm"
          variant="secondary"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
        <CopyButton label="Copy input" value={value} />
        <Button onClick={handleDownload} size="sm" variant="secondary">
          <Download className="h-4 w-4" />
          Download current file
        </Button>
        <Button
          onClick={() => {
            setSoftWrapEnabled((current) => !current);
          }}
          size="sm"
          variant={softWrapEnabled ? "primary" : "secondary"}
        >
          {softWrapEnabled ? "Soft wrap on" : "Soft wrap off"}
        </Button>
        <Button onClick={handleSelectAll} size="sm" variant="secondary">
          Select all
        </Button>
        <Button
          onClick={() => {
            setPreferTextarea((current) => !current);
            setEditorError(null);
          }}
          size="sm"
          variant={preferTextarea ? "primary" : "ghost"}
        >
          {preferTextarea ? "Use code editor" : "Use plain textarea"}
        </Button>
        <Button disabled size="sm" variant="ghost">
          Format YAML
        </Button>
      </div>

      <p className="text-xs leading-6 text-muted-foreground">
        YAML formatting is intentionally deferred for now so comments and layout
        are not accidentally rewritten.
      </p>

      {isFallbackMode ? (
        <Textarea
          aria-label={label}
          className="min-h-[24rem] font-mono text-[0.925rem] leading-6"
          data-testid="workflow-yaml-textarea"
          id={textareaId}
          onChange={handleTextareaChange}
          onFocus={handleTextareaFocus}
          placeholder="name: CI&#10;on: [push]&#10;jobs: ..."
          ref={fallbackTextareaRef}
          rows={18}
          spellCheck={false}
          value={value}
          wrap={softWrapEnabled ? "soft" : "off"}
        />
      ) : (
        <div
          className="overflow-hidden rounded-[var(--radius-md)]"
          data-testid="workflow-yaml-editor"
          ref={editorContainerRef}
        />
      )}

      {diagnostics.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {severityDisplayOrder.map((severity) => {
            const severityCount = diagnostics.filter((finding) => {
              return finding.severity === severity;
            }).length;

            if (severityCount === 0) {
              return null;
            }

            return (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                  getSeverityTone(severity) === "danger"
                    ? "bg-danger/12 text-danger"
                    : getSeverityTone(severity) === "severity-high"
                      ? "bg-severity-high/12 text-severity-high"
                      : getSeverityTone(severity) === "severity-medium"
                        ? "bg-severity-medium/14 text-severity-medium"
                        : getSeverityTone(severity) === "severity-low"
                          ? "bg-severity-low/12 text-severity-low"
                          : "bg-info/12 text-info"
                }`}
                key={severity}
              >
                {severityCount} {severity}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function focusEditorJumpTarget(
  filePath: string,
  jumpTarget: WorkflowEditorJumpTarget | null,
  activeFinding: AnalyzerFinding | null,
  value: string,
  editorView: EditorView | null,
  fallbackTextarea: HTMLTextAreaElement | null,
  lastHandledJumpRef: { current: number | null },
) {
  if (!jumpTarget) {
    return;
  }

  const normalizedFilePath = normalizeWorkflowPath(filePath).toLowerCase();

  if (
    normalizeWorkflowPath(jumpTarget.filePath).toLowerCase() !==
    normalizedFilePath
  ) {
    return;
  }

  if (lastHandledJumpRef.current === jumpTarget.sequence) {
    return;
  }

  lastHandledJumpRef.current = jumpTarget.sequence;
  const nextRange = getDocumentRange(
    value,
    jumpTarget.line,
    jumpTarget.column,
    jumpTarget.endLine ?? activeFinding?.location?.endLine,
    jumpTarget.endColumn ?? activeFinding?.location?.endColumn,
  );

  if (editorView) {
    editorView.focus();
    editorView.dispatch({
      effects: setActiveLineEffect.of(nextRange.from),
      scrollIntoView: true,
      selection: EditorSelection.range(nextRange.from, nextRange.to),
    });
    return;
  }

  fallbackTextarea?.focus();
  fallbackTextarea?.setSelectionRange(nextRange.from, nextRange.to);
}

function syncEditorDiagnostics(
  editorView: EditorView,
  findings: readonly AnalyzerFinding[],
) {
  const diagnostics = findings
    .filter((finding) => finding.location)
    .map((finding) => {
      return createDiagnosticForFinding(editorView.state, finding);
    });

  editorView.dispatch(setDiagnostics(editorView.state, diagnostics));
}

function syncActiveFindingHighlight(
  editorView: EditorView,
  location: SourceLocation | undefined,
) {
  if (!location) {
    editorView.dispatch({
      effects: setActiveLineEffect.of(null),
    });
    return;
  }

  const position = getPositionForLocation(editorView.state, location);

  editorView.dispatch({
    effects: setActiveLineEffect.of(position.from),
  });
}

function createDiagnosticForFinding(
  state: EditorState,
  finding: AnalyzerFinding,
): Diagnostic {
  const position = getPositionForLocation(state, finding.location);

  return {
    from: position.from,
    markClass: getDiagnosticMarkClass(finding.severity),
    message: finding.message,
    renderMessage() {
      return createDiagnosticMessageNode(finding);
    },
    severity: getDiagnosticSeverity(finding.severity),
    to: position.to,
  };
}

function getPositionForLocation(
  state: EditorState,
  location: SourceLocation | undefined,
) {
  if (!location) {
    return {
      from: 0,
      to: 0,
    };
  }

  return getDocumentRange(
    state.doc.toString(),
    location.line,
    location.column,
    location.endLine,
    location.endColumn,
  );
}

function getDocumentRange(
  documentText: string,
  line: number,
  column: number,
  endLine?: number | undefined,
  endColumn?: number | undefined,
) {
  const lineStarts = getLineStarts(documentText);
  const lineCount = Math.max(lineStarts.length, 1);
  const safeLine = clamp(line, 1, lineCount);
  const safeEndLine = clamp(endLine ?? safeLine, safeLine, lineCount);
  const lineOffset = getLineOffset(documentText, lineStarts, safeLine, column);
  const endOffset = getLineOffset(
    documentText,
    lineStarts,
    safeEndLine,
    endColumn ?? Math.max(column + 1, column),
  );
  const nextTo =
    endOffset > lineOffset
      ? endOffset
      : getLineEndOffset(documentText, lineStarts, safeLine, lineOffset);

  return {
    from: lineOffset,
    to: Math.max(lineOffset, nextTo),
  };
}

function getLineStarts(documentText: string) {
  const lineStarts = [0];

  for (let index = 0; index < documentText.length; index += 1) {
    const character = documentText[index];

    if (character === "\r") {
      if (documentText[index + 1] === "\n") {
        index += 1;
      }

      lineStarts.push(index + 1);
      continue;
    }

    if (character === "\n") {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}

function getLineOffset(
  documentText: string,
  lineStarts: number[],
  lineNumber: number,
  column: number,
) {
  const lineStart = lineStarts[lineNumber - 1] ?? 0;
  const lineEnd = getLineBreakStart(
    documentText,
    lineStart,
    lineStarts[lineNumber] ?? documentText.length,
  );

  return lineStart + clamp(column - 1, 0, lineEnd - lineStart);
}

function getLineEndOffset(
  documentText: string,
  lineStarts: number[],
  lineNumber: number,
  fallback: number,
) {
  const lineStart = lineStarts[lineNumber - 1] ?? 0;
  const nextLineStart = lineStarts[lineNumber] ?? documentText.length;
  const lineEnd = getLineBreakStart(documentText, lineStart, nextLineStart);
  const minimumWidth = lineEnd > lineStart ? lineEnd : nextLineStart;

  if (documentText.length === 0) {
    return 0;
  }

  return Math.min(documentText.length, Math.max(fallback + 1, minimumWidth));
}

function getLineBreakStart(
  documentText: string,
  lineStart: number,
  nextLineStart: number,
) {
  let lineEnd = nextLineStart;

  while (lineEnd > lineStart) {
    const previousCharacter = documentText[lineEnd - 1];

    if (previousCharacter !== "\n" && previousCharacter !== "\r") {
      break;
    }

    lineEnd -= 1;
  }

  return lineEnd;
}

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.min(Math.max(value, minValue), maxValue);
}

function getDiagnosticSeverity(severity: Severity): Diagnostic["severity"] {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
    case "info":
    default:
      return "info";
  }
}

function getDiagnosticMarkClass(severity: Severity) {
  switch (severity) {
    case "critical":
    case "high":
      return "cm-authos-diagnostic-error";
    case "medium":
      return "cm-authos-diagnostic-warning";
    case "low":
    case "info":
    default:
      return "cm-authos-diagnostic-info";
  }
}

function createDiagnosticMessageNode(finding: AnalyzerFinding) {
  const container = window.document.createElement("div");
  const ruleId = window.document.createElement("div");
  const title = window.document.createElement("div");
  const copy = window.document.createElement("div");

  container.className = "cm-authos-diagnostic-body";
  ruleId.className = "cm-authos-diagnostic-rule";
  ruleId.textContent = finding.ruleId;
  title.className = "cm-authos-diagnostic-title";
  title.textContent = finding.title;
  copy.className = "cm-authos-diagnostic-copy";
  copy.textContent = finding.message;

  container.append(ruleId, title, copy);

  return container;
}

function getDownloadFileName(filePath: string) {
  const normalizedPath = normalizeWorkflowPath(filePath);
  const segments = normalizedPath.split("/");
  const lastSegment = segments.at(-1)?.trim();

  return lastSegment && lastSegment.length > 0 ? lastSegment : "workflow.yml";
}
