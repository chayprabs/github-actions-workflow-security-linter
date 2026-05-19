import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const authosIgnorePattern = /#\s*authos-ignore\b/u;

export type FormatWorkflowYamlResult =
  | { ok: true; content: string }
  | { ok: false; reason: string };

export function canSafelyFormatWorkflowYaml(content: string) {
  if (content.trim().length === 0) {
    return {
      allowed: false,
      reason: "The workflow file is empty.",
    };
  }

  if (authosIgnorePattern.test(content)) {
    return {
      allowed: false,
      reason:
        "This file contains Authos ignore comments. Formatting is blocked so suppressions stay in place.",
    };
  }

  if (/#/u.test(content)) {
    return {
      allowed: false,
      reason:
        "This file contains comments. Formatting is blocked to avoid rewriting reviewer notes.",
    };
  }

  return { allowed: true };
}

export function formatWorkflowYaml(content: string): FormatWorkflowYamlResult {
  const guard = canSafelyFormatWorkflowYaml(content);

  if (!guard.allowed) {
    return {
      ok: false,
      reason: guard.reason ?? "This workflow file cannot be formatted safely.",
    };
  }

  try {
    const document = parseYaml(content, {
      prettyErrors: true,
    });

    if (document === null || document === undefined) {
      return {
        ok: false,
        reason: "The workflow file is empty.",
      };
    }

    if (Array.isArray(document)) {
      return {
        ok: false,
        reason: "Multi-document YAML cannot be formatted safely.",
      };
    }

    const formatted = stringifyYaml(document, {
      indent: 2,
      lineWidth: 0,
    }).trimEnd();

    return {
      ok: true,
      content: `${formatted}\n`,
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : "Authos could not parse this YAML file.",
    };
  }
}
