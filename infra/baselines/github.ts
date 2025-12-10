/**
 * GitHub Baseline Computer
 * Computes identity vs. current-phase patterns from GitHub activity
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
} from "../baseline.js";

/**
 * Compute baseline analysis for GitHub data
 */
export function computeGitHubBaseline(
  current: GitHubData,
  history: Snapshot<GitHubData>[]
): SourceAnalysis {
  const narrativeSignals: string[] = [];

  // Extract historical commit counts
  const commitHistory = history.map((s) => s.data.recent_activity.commits);
  const currentCommits = current.recent_activity.commits;

  // Extract historical language distributions
  const languageHistory = history.map((s) =>
    Object.entries(s.data.languages)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang)
  );
  const currentLanguages = Object.entries(current.languages)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  // Calculate stability scores
  const commitStability = calculateNumericStability([
    currentCommits,
    ...commitHistory,
  ]);
  const languageStability = calculateListStability(
    [currentLanguages, ...languageHistory],
    5
  );

  // Overall stability is weighted average
  const stabilityScore = commitStability * 0.4 + languageStability * 0.6;

  // Identify core languages (appear consistently)
  const coreLanguages = findCoreItems([currentLanguages, ...languageHistory], 0.6);

  // Identify core repos (frequently touched)
  const repoHistory = history.map((s) => s.data.recent_activity.repos_touched);
  const coreRepos = findCoreItems(
    [current.recent_activity.repos_touched, ...repoHistory],
    0.5
  );

  // Detect commit trend
  const commitTrend = detectTrend([...commitHistory.reverse(), currentCommits]);

  // Generate narrative signals

  // Language identity
  if (coreLanguages.length > 0) {
    const langStr = coreLanguages.slice(0, 2).join(" and ");
    if (languageStability > 0.7) {
      narrativeSignals.push(`consistently working in ${langStr}`);
    } else {
      narrativeSignals.push(`primarily working in ${langStr}`);
    }
  }

  // Activity level
  if (history.length > 0) {
    const avgCommits = average(commitHistory);
    const changeDesc = describeChange(currentCommits, avgCommits, "commits");

    if (changeDesc) {
      narrativeSignals.push(`coding activity ${changeDesc}`);
    } else if (commitStability > 0.7) {
      narrativeSignals.push("maintaining a steady coding pace");
    }

    // Trend-based signals
    if (commitTrend === "increasing") {
      narrativeSignals.push("ramping up development activity");
    } else if (commitTrend === "decreasing") {
      narrativeSignals.push("in a quieter coding phase");
    }
  } else {
    // No history yet
    if (currentCommits > 20) {
      narrativeSignals.push("actively building");
    } else if (currentCommits > 5) {
      narrativeSignals.push("steadily coding");
    }
  }

  // Recent project focus
  const recentProjects = current.repos
    .filter((r) => r.description)
    .slice(0, 2);
  if (recentProjects.length > 0) {
    const projectNames = recentProjects.map((r) => r.name).join(" and ");
    narrativeSignals.push(`focused on ${projectNames}`);
  }

  return {
    identity: {
      core_languages: coreLanguages,
      core_repos: coreRepos,
      typical_commit_rate: history.length > 0 ? average(commitHistory) : currentCommits,
    },
    current_phase: {
      commits: currentCommits,
      languages: currentLanguages.slice(0, 5),
      active_repos: current.recent_activity.repos_touched,
      trend: commitTrend,
      vs_baseline:
        history.length > 0
          ? `${percentChange(currentCommits, average(commitHistory)).toFixed(0)}%`
          : null,
    },
    stability_score: stabilityScore,
    narrative_signals: narrativeSignals,
  };
}

