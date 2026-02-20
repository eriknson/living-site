import { NextResponse } from "next/server";

interface ContributionDay {
  date: string;
  contributionCount: number;
}

interface ContributionWeek {
  contributionDays: ContributionDay[];
}

interface GraphQLResponse {
  data?: {
    viewer?: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: ContributionWeek[];
        };
      };
    };
  };
  errors?: { message: string }[];
}

const QUERY = `
query($from: DateTime!, $to: DateTime!) {
  viewer {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

async function fetchContributions(
  token: string,
  from: Date,
  to: Date
): Promise<ContributionDay[]> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "living-site",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    }),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new Error(`GitHub GraphQL API error: ${res.status}`);
  }

  const json: GraphQLResponse = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  const weeks =
    json.data?.viewer?.contributionsCollection.contributionCalendar.weeks ?? [];

  return weeks.flatMap((w) => w.contributionDays);
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

  if (!token) {
    return NextResponse.json(
      { error: "No GitHub token configured" },
      { status: 500 }
    );
  }

  try {
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 90);

    const days = await fetchContributions(token, from, now);

    const points = days.map((d) => ({
      time: new Date(d.date + "T12:00:00Z").getTime() / 1000,
      value: d.contributionCount,
    }));

    const today = now.toISOString().split("T")[0];
    const todayEntry = days.find((d) => d.date === today);
    const latestValue = todayEntry?.contributionCount ?? points[points.length - 1]?.value ?? 0;

    const totalContributions = days.reduce(
      (sum, d) => sum + d.contributionCount,
      0
    );
    const daysWithActivity = days.filter((d) => d.contributionCount > 0).length;

    const avg =
      days.length > 0 ? totalContributions / days.length : 0;

    return NextResponse.json({
      points,
      latestValue,
      totalContributions,
      daysWithActivity,
      totalDays: days.length,
      avgPerDay: Math.round(avg * 10) / 10,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
