# Product Spec

Analyze GitHub Actions workflow YAML for syntax, reliability, permissions, triggers, and supply-chain security risks.

## Inputs

- Paste workflow YAML.
- Upload `.yml` or `.yaml` files.
- Upload multiple workflow files in one session.
- Import a public GitHub repository later.

## Outputs

- Findings with rule IDs and severity.
- Overall score.
- Line-level diagnostics.
- Action inventory.
- Matrix preview.
- Permission recommendations.
- Markdown, JSON, SARIF, and HTML exports.

## Privacy

- Local-only by default.

## Product Notes

- Core analysis works without login.
- No AI APIs.
- No backend upload of pasted files or pasted content.
- No database dependency in the initial product direction.
