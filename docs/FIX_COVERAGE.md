# Auto-fix coverage matrix

Legend: **safe** = one-click apply without review; **review** = suggested edit that may need human judgment; **manual** = guidance only; **none** = no fix metadata.

| Rule range    | Coverage        | Notes                                                  |
| ------------- | --------------- | ------------------------------------------------------ |
| GHA001–GHA010 | manual / none   | Parse and syntax findings need author review           |
| GHA050–GHA110 | review / manual | Trigger and permission rules include review snippets   |
| GHA111–GHA113 | manual          | Reusable workflow heuristics (new pack)                |
| GHA200–GHA210 | safe / review   | Supply-chain pinning and registry rules                |
| GHA300–GHA303 | manual          | Shell and command construction (new pack)              |
| GHA400–GHA410 | safe / review   | Reliability rules including GHA402 concurrency inserts |
| GHA900–GHA902 | none            | Meta/input/engine rules                                |

Use **Apply all safe fixes** in the findings panel or **Apply new safe fixes** in compare mode for batched remediation across files.
