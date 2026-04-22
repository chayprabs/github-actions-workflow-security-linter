import {
  isCheckoutActionInventoryItem,
  isLatestActionRef,
  isRepositoryBackedActionInventoryItem,
  isTagLikeActionRefKind,
} from "@/features/actions-analyzer/lib/action-inventory";
import { createRuleFinding } from "@/features/actions-analyzer/lib/create-rule-finding";
import {
  buildEvidence,
  findPathLocation,
  requireRuleDefinition,
} from "@/features/actions-analyzer/lib/rules/rule-helpers";
import type {
  ActionInventoryItem,
  AnalyzerProfile,
  RuleModule,
} from "@/features/actions-analyzer/types";

const thirdPartyUnpinnedRuleDefinition = requireRuleDefinition("GHA200");
const firstPartyMutableTagRuleDefinition = requireRuleDefinition("GHA201");
const branchRefRuleDefinition = requireRuleDefinition("GHA202");
const shortShaRuleDefinition = requireRuleDefinition("GHA203");
const dockerDigestRuleDefinition = requireRuleDefinition("GHA204");
const dynamicUsesRuleDefinition = requireRuleDefinition("GHA205");
const checkoutPersistedCredentialsRuleDefinition = requireRuleDefinition("GHA206");
const latestTagRuleDefinition = requireRuleDefinition("GHA207");
const privilegedThirdPartyReferenceRuleDefinition = requireRuleDefinition("GHA208");

export const thirdPartyUnpinnedRule: RuleModule = {
  definition: thirdPartyUnpinnedRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (
        item.origin !== "third-party" ||
        !isRepositoryBackedActionInventoryItem(item) ||
        item.refKind === "full-sha" ||
        item.refKind === "none"
      ) {
        return [];
      }

      return [
        createRuleFinding(
          thirdPartyUnpinnedRuleDefinition,
          {
            evidence: buildEvidence(
              context.getParsedFile(item.filePath),
              item.location,
            ),
            filePath: item.filePath,
            location: item.location,
            message: `Third-party ${getReferenceSubject(item)} \`${item.uses}\` is not pinned to a full commit SHA. Mutable tags or branches can change after review.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              "Pin the third-party reference to a reviewed 40-character commit SHA. This tool intentionally does not suggest an automatic SHA replacement because it cannot safely infer the intended commit.",
            severity: isStrictSupplyChainProfile(context.settings.profile)
              ? "high"
              : "medium",
          },
          index,
        ),
      ];
    });
  },
};

export const firstPartyMutableTagRule: RuleModule = {
  definition: firstPartyMutableTagRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (
        item.origin !== "first-party" ||
        !isRepositoryBackedActionInventoryItem(item) ||
        !isTagLikeActionRefKind(item.refKind)
      ) {
        return [];
      }

      return [
        createRuleFinding(
          firstPartyMutableTagRuleDefinition,
          {
            evidence: buildEvidence(
              context.getParsedFile(item.filePath),
              item.location,
            ),
            filePath: item.filePath,
            location: item.location,
            message: `First-party ${getReferenceSubject(item)} \`${item.uses}\` uses mutable tag \`${item.ref}\`. Many teams accept this for \`actions/*\`, but strict supply-chain mode requires SHA pinning.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              "If your policy requires immutable refs, pin the first-party reference to a full 40-character commit SHA and rotate it intentionally during updates.",
            severity: isStrictSupplyChainProfile(context.settings.profile)
              ? "medium"
              : "low",
          },
          index,
        ),
      ];
    });
  },
};

export const branchReferenceRule: RuleModule = {
  definition: branchRefRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (
        !isRepositoryBackedActionInventoryItem(item) ||
        item.refKind !== "branch" ||
        (item.origin !== "first-party" && item.origin !== "third-party")
      ) {
        return [];
      }

      return [
        createRuleFinding(
          branchRefRuleDefinition,
          {
            confidence: getBranchConfidence(item.ref),
            evidence: buildEvidence(
              context.getParsedFile(item.filePath),
              item.location,
            ),
            filePath: item.filePath,
            location: item.location,
            message: `\`${item.uses}\` uses branch \`${item.ref}\`, which can move independently of review and is highly mutable.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              "Pin the reference to a full 40-character commit SHA instead of a branch name.",
            severity: item.origin === "third-party" ? "high" : "medium",
          },
          index,
        ),
      ];
    });
  },
};

export const shortShaRule: RuleModule = {
  definition: shortShaRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (
        !isRepositoryBackedActionInventoryItem(item) ||
        item.refKind !== "short-sha"
      ) {
        return [];
      }

      return [
        createRuleFinding(
          shortShaRuleDefinition,
          {
            evidence: buildEvidence(
              context.getParsedFile(item.filePath),
              item.location,
            ),
            filePath: item.filePath,
            location: item.location,
            message: `\`${item.uses}\` uses short SHA \`${item.ref}\`, which is better than a tag or branch but not strict enough for immutable pinning.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              "Use the full 40-character commit SHA so reviewers can verify the exact immutable reference.",
            severity: item.origin === "third-party" ? "high" : "medium",
          },
          index,
        ),
      ];
    });
  },
};

export const dockerDigestRule: RuleModule = {
  definition: dockerDigestRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (
        item.kind !== "docker" ||
        item.refKind === "digest" ||
        item.refKind === "expression"
      ) {
        return [];
      }

      return [
        createRuleFinding(
          dockerDigestRuleDefinition,
          {
            evidence: buildEvidence(
              context.getParsedFile(item.filePath),
              item.location,
            ),
            filePath: item.filePath,
            location: item.location,
            message: `Docker action image \`${item.uses}\` is not pinned by digest. Mutable tags can change after review.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              "Pin the Docker reference with an immutable `@sha256:...` digest.",
            severity: shouldUseHigherDockerSeverity(
              context.settings.profile,
              item,
            )
              ? "high"
              : "medium",
          },
          index,
        ),
      ];
    });
  },
};

export const dynamicUsesReferenceRule: RuleModule = {
  definition: dynamicUsesRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (!item.uses.includes("${{")) {
        return [];
      }

      return [
        createRuleFinding(
          dynamicUsesRuleDefinition,
          {
            evidence: buildEvidence(
              context.getParsedFile(item.filePath),
              item.location,
            ),
            filePath: item.filePath,
            location: item.location,
            message: `\`uses\` reference \`${item.uses}\` is dynamic, so the selected ${getReferenceSubject(item)} is chosen at runtime instead of being reviewable in the workflow file.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              "Use a static action or reusable workflow reference so the reviewed dependency is visible in the workflow file and can be pinned safely.",
          },
          index,
        ),
      ];
    });
  },
};

export const checkoutPersistedCredentialsRule: RuleModule = {
  definition: checkoutPersistedCredentialsRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (
        !isCheckoutActionInventoryItem(item) ||
        !hasRepositoryWriteExposure(item)
      ) {
        return [];
      }

      const workflow = context.getWorkflow(item.filePath);
      const job = workflow?.jobs.find((candidate) => candidate.id === item.jobId);
      const step =
        job && typeof item.stepIndex === "number"
          ? job.steps[item.stepIndex]
          : undefined;
      const persistCredentialsValue = step?.with.value?.["persist-credentials"];

      if (isPersistCredentialsDisabled(persistCredentialsValue)) {
        return [];
      }

      const parsedFile = context.getParsedFile(item.filePath);
      const location =
        findPathLocation(parsedFile, [
          "jobs",
          item.jobId,
          "steps",
          item.stepIndex ?? 0,
          "with",
          "persist-credentials",
        ]) ??
        item.location;

      return [
        createRuleFinding(
          checkoutPersistedCredentialsRuleDefinition,
          {
            confidence: "medium",
            evidence: buildEvidence(parsedFile, location),
            filePath: item.filePath,
            location,
            message: `\`${item.uses}\` leaves credentials configured in job \`${item.jobId}\`, and that job has write permissions. Later git commands in the same job can reuse the token unless \`persist-credentials: false\` is set.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              "Set `persist-credentials: false` unless the job intentionally needs authenticated git pushes after checkout. If pushes are required, isolate them to the smallest possible job.",
            severity: shouldElevateCheckoutSeverity(context.settings.profile)
              ? "high"
              : "medium",
          },
          index,
        ),
      ];
    });
  },
};

export const latestTagRule: RuleModule = {
  definition: latestTagRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (!isLatestActionRef(item.ref)) {
        return [];
      }

      const severity = item.kind === "docker" ? "high" : "medium";

      return [
        createRuleFinding(
          latestTagRuleDefinition,
          {
            evidence: buildEvidence(
              context.getParsedFile(item.filePath),
              item.location,
            ),
            filePath: item.filePath,
            location: item.location,
            message: `\`${item.uses}\` uses the \`latest\` tag, which is expected to move as new releases are published.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              item.kind === "docker"
                ? "Replace `latest` with an immutable `@sha256:...` digest."
                : "Replace `latest` with a reviewed full commit SHA, or at minimum a deliberately chosen version ref.",
            severity,
          },
          index,
        ),
      ];
    });
  },
};

export const privilegedThirdPartyReferenceRule: RuleModule = {
  definition: privilegedThirdPartyReferenceRuleDefinition,
  check(context) {
    return context.actionInventory.flatMap((item, index) => {
      if (item.origin !== "third-party" || !item.isPrivileged) {
        return [];
      }

      const hasExplicitPrivilege =
        item.permissions.hasWriteAccess || item.permissions.hasIdTokenWrite;

      return [
        createRuleFinding(
          privilegedThirdPartyReferenceRuleDefinition,
          {
            confidence: hasExplicitPrivilege ? "high" : "medium",
            evidence: buildEvidence(
              context.getParsedFile(item.filePath),
              item.location,
            ),
            filePath: item.filePath,
            location: item.location,
            message: `Third-party ${getReferenceSubject(item)} \`${item.uses}\` runs in privileged job \`${item.jobId}\` (${item.privilegedReasons.join("; ")}). A compromise in the external dependency would have a larger blast radius here.`,
            relatedJobs: [item.jobId],
            relatedSteps: getRelatedSteps(item),
            remediation:
              "Pin the external reference to a reviewed commit SHA, reduce the job permissions, and isolate deploy or release work into smaller trusted jobs where possible.",
            severity: hasExplicitPrivilege ? "high" : "medium",
          },
          index,
        ),
      ];
    });
  },
};

function getBranchConfidence(ref: string | null) {
  const normalizedRef = ref?.trim().toLowerCase();

  if (
    normalizedRef === "main" ||
    normalizedRef === "master" ||
    normalizedRef?.startsWith("refs/heads/") ||
    normalizedRef?.startsWith("heads/")
  ) {
    return "high";
  }

  return "medium";
}

function getReferenceSubject(item: ActionInventoryItem) {
  if (item.kind === "reusable-workflow") {
    return "reusable workflow";
  }

  if (item.kind === "docker") {
    return "Docker action image";
  }

  return "action";
}

function getRelatedSteps(item: ActionInventoryItem) {
  return item.stepLabel ? [item.stepLabel] : [];
}

function hasRepositoryWriteExposure(item: ActionInventoryItem) {
  return (
    item.permissions.shorthand === "write-all" ||
    item.permissions.writeScopes.some((scope) => scope !== "id-token")
  );
}

function isPersistCredentialsDisabled(value: unknown) {
  return (
    value === false ||
    (typeof value === "string" && value.trim().toLowerCase() === "false")
  );
}

function isStrictSupplyChainProfile(profile: AnalyzerProfile) {
  return profile === "open-source" || profile === "strict-security";
}

function shouldElevateCheckoutSeverity(profile: AnalyzerProfile) {
  return (
    profile === "deploy-release" ||
    profile === "open-source" ||
    profile === "strict-security"
  );
}

function shouldUseHigherDockerSeverity(
  profile: AnalyzerProfile,
  item: ActionInventoryItem,
) {
  return isStrictSupplyChainProfile(profile) || isLatestActionRef(item.ref);
}
