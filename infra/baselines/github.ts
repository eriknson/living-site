/**
 * GitHub Baseline Computer
 * Computes identity vs. current-phase patterns from GitHub activity
 * Focused on: commit themes, project focus, activity cadence, and eras
 */

import type { GitHubData } from "../fetchers/github.js";
import type { Snapshot } from "../history.js";
import {
  type SourceAnalysis,
  average,
  calculateNumericStability,
  calculateListStability,
  detectTrend,
  describeChange,
  findCoreItems,
  percentChange,
  jaccardSimilarity,
} from "../baseline.js";

// ============================================================================
// Commit Theme Detection
// ============================================================================

type CommitTheme =
  | "features"
  | "fixes"
  | "refactoring"
  | "docs"
  | "infra"
  | "misc";

interface ThemeCounts {
  features: number;
  fixes: number;
  refactoring: number;
  docs: number;
  infra: number;
  misc: number;
}

/**
 * Detect the theme of a commit message using conventional commits or keywords
 */
function detectCommitTheme(message: string): CommitTheme {
  const lower = message.toLowerCase();

  // Conventional commit prefixes
  if (/^feat(\(|:|\s)/i.test(message)) return "features";
  if (/^fix(\(|:|\s)/i.test(message)) return "fixes";
  if (/^refactor(\(|:|\s)/i.test(message)) return "refactoring";
  if (/^docs?(\(|:|\s)/i.test(message)) return "docs";
  if (/^(chore|ci|build|infra)(\(|:|\s)/i.test(message)) return "infra";

  // Keyword heuristics
  if (/\b(add|implement|create|new|feature)\b/i.test(lower)) return "features";
  if (/\b(fix|bug|patch|resolve|issue)\b/i.test(lower)) return "fixes";
  if (/\b(refactor|clean|reorganize|restructure|simplify)\b/i.test(lower))
    return "refactoring";
  if (/\b(doc|readme|comment|typo)\b/i.test(lower)) return "docs";
  if (/\b(config|setup|ci|deploy|build|deps?|upgrade|update)\b/i.test(lower))
    return "infra";

  return "misc";
}

/**
 * Analyze commit messages and return theme distribution
 */
function analyzeCommitThemes(messages: string[]): ThemeCounts {
  const counts: ThemeCounts = {
    features: 0,
    fixes: 0,
    refactoring: 0,
    docs: 0,
    infra: 0,
    misc: 0,
  };

  for (const msg of messages) {
    const theme = detectCommitTheme(msg);
    counts[theme]++;
  }

  return counts;
}

/**
 * Get the dominant theme from theme counts
 */
function getDominantTheme(counts: ThemeCounts): CommitTheme | null {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const sorted = Object.entries(counts)
    .filter(([key]) => key !== "misc")
    .sort((a, b) => b[1] - a[1]);

  const [topTheme, topCount] = sorted[0] || ["misc", 0];

  // Only return if it's at least 30% of non-misc commits
  const nonMisc = total - counts.misc;
  if (nonMisc > 0 && topCount / nonMisc >= 0.3) {
    return topTheme as CommitTheme;
  }

  return null;
}

// ============================================================================
// Era Detection
// ============================================================================

interface Era {
  type: "focused" | "exploring" | "building" | "maintaining";
  started_weeks_ago: number;
  primary_repos: string[];
}

/**
 * Detect the current era based on historical patterns
 */
function detectEra(
  currentRepos: string[],
  repoHistory: string[][],
  currentThemes: ThemeCounts
): Era {
  const weeksOfHistory = repoHistory.length;

  // Determine focus type based on repo diversity
  const currentRepoCount = currentRepos.length;
  const avgRepoCount =
    repoHistory.length > 0
      ? average(repoHistory.map((r) => r.length))
      : currentRepoCount;

  // Determine era type
  let eraType: Era["type"];
  const dominantTheme = getDominantTheme(currentThemes);

  if (currentRepoCount <= 2 && dominantTheme === "features") {
    eraType = "building";
  } else if (currentRepoCount <= 2) {
    eraType = "focused";
  } else if (dominantTheme === "fixes" || dominantTheme === "infra") {
    eraType = "maintaining";
  } else {
    eraType = "exploring";
  }

  // Find when this era started by looking for repo focus shifts
  let eraStartedWeeksAgo = 0;
  if (weeksOfHistory > 0) {
    const currentSet = new Set(currentRepos);

    for (let i = 0; i < Math.min(weeksOfHistory, 12); i++) {
      const historicalSet = new Set(repoHistory[i] || []);
      const similarity = jaccardSimilarity(currentSet, historicalSet);

      // If similarity drops below 0.4, consider it a different era
      if (similarity < 0.4) {
        break;
      }
      eraStartedWeeksAgo = i + 1;
    }
  }

  // Find primary repos (most frequently touched in this era)
  const eraRepoLists = [
    currentRepos,
    ...repoHistory.slice(0, eraStartedWeeksAgo),
  ];
  const primaryRepos = findCoreItems(eraRepoLists, 0.5).slice(0, 3);

  return {
    type: eraType,
    started_weeks_ago: eraStartedWeeksAgo,
    primary_repos:
      primaryRepos.length > 0 ? primaryRepos : currentRepos.slice(0, 2),
  };
}

// ============================================================================
// Main Baseline Computer
// ============================================================================

/**
 * Compute baseline analysis for GitHub data
 */
export function computeGitHubBaseline(
  current: GitHubData,
  history: Snapshot<GitHubData>[]
): SourceAnalysis {
  const narrativeSignals: string[] = [];

  // Extract historical data
  const commitHistory = history.map((s) => s.data.recent_activity.commits);
  const currentCommits = current.recent_activity.commits;
  const repoHistory = history.map((s) => s.data.recent_activity.repos_touched);
  const currentRepos = current.recent_activity.repos_touched;

  // Use active_repos if available (sorted by recent commit activity)
  const activeRepos = current.active_repos || [];
  const topActiveRepos = activeRepos
    .filter((r) => r.recent_commits > 0)
    .slice(0, 5);

  // External contributions
  const externalContribs = current.external_contributions || [];

  // Analyze commit themes
  const commitMessages = current.recent_activity.commit_messages || [];
  const currentThemes = analyzeCommitThemes(commitMessages);

  // Calculate stability scores
  const commitStability = calculateNumericStability([
    currentCommits,
    ...commitHistory,
  ]);
  const repoStability = calculateListStability(
    [currentRepos, ...repoHistory],
    5
  );
  const stabilityScore = commitStability * 0.5 + repoStability * 0.5;

  // Identify core repos (frequently touched over time)
  const coreRepos = findCoreItems([currentRepos, ...repoHistory], 0.4);

  // Detect commit trend
  const commitTrend = detectTrend([...commitHistory.reverse(), currentCommits]);

  // Detect current era
  const era = detectEra(currentRepos, repoHistory, currentThemes);

  // =========================================================================
  // Generate Narrative Signals
  // =========================================================================

  // Use active_repos for more accurate "currently working on" signals
  if (topActiveRepos.length > 0) {
    const topRepo = topActiveRepos[0];
    const repoName = topRepo.name;

    if (topActiveRepos.length === 1) {
      narrativeSignals.push(`deep in ${repoName}`);
    } else if (topActiveRepos.length === 2) {
      narrativeSignals.push(
        `working on ${repoName} and ${topActiveRepos[1].name}`
      );
    } else {
      narrativeSignals.push(
        `most active in ${repoName} (${topRepo.recent_commits} recent commits)`
      );
    }
  } else if (era.started_weeks_ago > 4) {
    // Fall back to era-based signal
    const months = Math.floor(era.started_weeks_ago / 4);
    const repoStr = era.primary_repos.slice(0, 2).join(" and ");
    if (era.type === "building") {
      narrativeSignals.push(`been building ${repoStr} for ${months}+ months`);
    } else if (era.type === "focused") {
      narrativeSignals.push(`focused on ${repoStr} for ${months}+ months`);
    } else if (era.type === "maintaining") {
      narrativeSignals.push(`maintaining and improving existing projects`);
    } else {
      narrativeSignals.push(`exploring across several projects`);
    }
  } else if (era.primary_repos.length > 0) {
    const repoStr = era.primary_repos.slice(0, 2).join(" and ");
    narrativeSignals.push(`currently focused on ${repoStr}`);
  }

  // External contributions signal
  if (externalContribs.length > 0) {
    const prContribs = externalContribs.filter(
      (c) => c.type === "pull_request"
    );
    const uniqueExternalRepos = [
      ...new Set(externalContribs.map((c) => c.repo.split("/").pop())),
    ];

    if (prContribs.length > 0) {
      const repoName = prContribs[0].repo.split("/").pop();
      if (prContribs.length === 1) {
        narrativeSignals.push(`contributed a PR to ${repoName}`);
      } else {
        narrativeSignals.push(
          `contributing to ${uniqueExternalRepos.slice(0, 2).join(" and ")}`
        );
      }
    } else if (uniqueExternalRepos.length > 0) {
      narrativeSignals.push(
        `collaborating on ${uniqueExternalRepos[0]}`
      );
    }
  }

  // Commit theme signal
  const dominantTheme = getDominantTheme(currentThemes);
  if (dominantTheme) {
    const themeSignals: Record<CommitTheme, string> = {
      features: "shipping new features",
      fixes: "in bug-fixing mode",
      refactoring: "cleaning up and refactoring",
      docs: "improving documentation",
      infra: "working on infrastructure and tooling",
      misc: "",
    };
    const signal = themeSignals[dominantTheme];
    if (signal) {
      narrativeSignals.push(signal);
    }
  }

  // Activity level signal
  if (history.length > 0) {
    const avgCommits = average(commitHistory);
    const changeDesc = describeChange(currentCommits, avgCommits, "commits");

    if (changeDesc) {
      narrativeSignals.push(`coding activity ${changeDesc}`);
    } else if (commitStability > 0.7) {
      narrativeSignals.push("steady coding pace");
    }

    // Trend-based signals
    if (commitTrend === "increasing") {
      narrativeSignals.push("ramping up development");
    } else if (commitTrend === "decreasing") {
      narrativeSignals.push("in a quieter phase");
    }
  } else {
    // No history yet - simple signal
    if (currentCommits > 20) {
      narrativeSignals.push("actively building");
    } else if (currentCommits > 5) {
      narrativeSignals.push("steadily coding");
    }
  }

  // Spread across many projects signal (only if not already covered by active_repos)
  if (topActiveRepos.length === 0 && currentRepos.length > 4) {
    narrativeSignals.push("spreading work across many projects");
  }

  return {
    identity: {
      core_repos: coreRepos,
      typical_commit_rate:
        history.length > 0 ? average(commitHistory) : currentCommits,
      work_style: era.type,
    },
    current_phase: {
      commits: currentCommits,
      active_repos: topActiveRepos.map((r) => r.full_name),
      external_contributions: externalContribs.length,
      commit_themes: currentThemes,
      dominant_theme: dominantTheme,
      trend: commitTrend,
      era: era,
      vs_baseline:
        history.length > 0
          ? `${percentChange(currentCommits, average(commitHistory)).toFixed(0)}%`
          : null,
    },
    stability_score: stabilityScore,
    narrative_signals: narrativeSignals,
  };
}
