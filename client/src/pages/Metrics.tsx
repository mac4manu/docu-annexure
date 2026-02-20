import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, MessagesSquare, User, Users, BarChart3, Loader2, Shield, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus, Clock, Gauge, Activity, CircleCheck, CircleAlert, CircleX } from "lucide-react";

interface MetricsData {
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  avgMessagesPerChat: number;
  uploadsThisWeek: number;
  uploadsLastWeek: number;
}

interface AdminUserMetrics {
  userId: string;
  email: string | null;
  name: string;
  documentCount: number;
  conversationCount: number;
  messageCount: number;
  questionsAsked: number;
  aiResponses: number;
  lastActive: string | null;
  status: "active" | "logged_in_only";
}

interface AdminMetricsData {
  totalUsers: number;
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  avgMessagesPerChat: number;
  uploadsThisWeek: number;
  uploadsLastWeek: number;
  userBreakdown: AdminUserMetrics[];
}

interface RatingMetrics {
  thumbsUp: number;
  thumbsDown: number;
  total: number;
}

interface ConfidenceMetrics {
  avgConfidence: number;
  totalScored: number;
}

interface ConfidenceDistribution {
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface RatingTrendEntry {
  week: string;
  thumbsUp: number;
  thumbsDown: number;
}

function timeAgo(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({ title, value, icon: Icon, subtitle, trend }: { title: string; value: string | number; icon: typeof FileText; subtitle?: string; trend?: { value: number; label: string } }) {
  const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null;
  const trendColor = trend ? (trend.value > 0 ? "text-green-600 dark:text-green-400" : trend.value < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground") : "";

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid={`card-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{title}</span>
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </div>
      <div className="px-4 py-3">
        <div className="text-2xl font-bold" data-testid={`text-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && TrendIcon && (
          <p className={`text-xs mt-1 flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryLine({ metrics }: { metrics: MetricsData | AdminMetricsData }) {
  const parts: string[] = [];
  if (metrics.totalDocuments > 0) parts.push(`${metrics.totalDocuments} document${metrics.totalDocuments !== 1 ? "s" : ""}`);
  if (metrics.totalConversations > 0) parts.push(`${metrics.totalConversations} conversation${metrics.totalConversations !== 1 ? "s" : ""}`);
  if ("userMessages" in metrics && metrics.userMessages > 0) parts.push(`${metrics.userMessages} question${metrics.userMessages !== 1 ? "s" : ""} asked`);
  if (parts.length === 0) return null;
  const isAdmin = "totalUsers" in metrics;
  const prefix = isAdmin ? "Platform total:" : "You've explored";
  return (
    <p className="text-sm text-foreground/70" data-testid="text-summary-line">
      {prefix} {parts.join(", ")}.
    </p>
  );
}

function AgentEvaluationSection({ ratingMetrics, confidenceMetrics, confidenceDistribution, ratingTrend }: {
  ratingMetrics?: RatingMetrics;
  confidenceMetrics?: ConfidenceMetrics;
  confidenceDistribution?: ConfidenceDistribution;
  ratingTrend?: RatingTrendEntry[];
}) {
  const accuracy = ratingMetrics && ratingMetrics.total > 0
    ? Math.round((ratingMetrics.thumbsUp / ratingMetrics.total) * 100)
    : null;

  const avgConfidence = confidenceMetrics?.avgConfidence ?? null;
  const confidenceColor = avgConfidence !== null ? (avgConfidence >= 80 ? "text-green-600 dark:text-green-400" : avgConfidence >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400") : "";
  const confidenceBarColor = avgConfidence !== null ? (avgConfidence >= 80 ? "bg-green-600 dark:bg-green-400" : avgConfidence >= 50 ? "bg-yellow-600 dark:bg-yellow-400" : "bg-red-600 dark:bg-red-400") : "";

  const hasRatings = ratingMetrics && ratingMetrics.total > 0;
  const hasConfidence = confidenceMetrics && confidenceMetrics.totalScored > 0;
  const hasDist = confidenceDistribution && confidenceDistribution.total > 0;
  const hasTrend = ratingTrend && ratingTrend.length > 0;

  if (!ratingMetrics && !confidenceMetrics) return null;

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-agent-evaluation">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Agent Evaluation</span>
      </div>
      <div className="px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div data-testid="section-accuracy">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Response Accuracy</span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-3xl font-bold" data-testid="text-accuracy-percentage">
                  {hasRatings ? `${accuracy}%` : "N/A"}
                </span>
                {hasRatings && (
                  <span className="text-xs text-muted-foreground">
                    from {ratingMetrics.total} rating{ratingMetrics.total !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {hasRatings ? (
                <>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="font-medium" data-testid="text-thumbs-up-count">{ratingMetrics.thumbsUp}</span>
                      <span className="text-[10px] text-muted-foreground">helpful</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ThumbsDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      <span className="font-medium" data-testid="text-thumbs-down-count">{ratingMetrics.thumbsDown}</span>
                      <span className="text-[10px] text-muted-foreground">unhelpful</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-2">
                    <div
                      className="h-full bg-green-600 dark:bg-green-400 rounded-full transition-all"
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">No ratings yet. Rate AI responses with thumbs up/down to track accuracy.</p>
              )}
            </div>

            {hasTrend && (
              <div data-testid="section-rating-trend">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Rating Trend (6 weeks)</span>
                <div className="mt-2 space-y-1.5">
                  {ratingTrend.map((entry, idx) => {
                    const total = entry.thumbsUp + entry.thumbsDown;
                    const upPct = total > 0 ? Math.round((entry.thumbsUp / total) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-2" data-testid={`trend-week-${idx}`}>
                        <span className="text-[10px] text-muted-foreground w-12 shrink-0">{entry.week}</span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          {total > 0 && (
                            <div className="h-full flex">
                              <div
                                className="h-full bg-green-500 dark:bg-green-400 transition-all"
                                style={{ width: `${upPct}%` }}
                              />
                              <div
                                className="h-full bg-red-400 dark:bg-red-500 transition-all"
                                style={{ width: `${100 - upPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{total}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />
                    <span>Helpful</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-red-400 dark:bg-red-500" />
                    <span>Unhelpful</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 md:border-l md:border-border md:pl-6">
            <div data-testid="section-confidence">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Avg Confidence Score</span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className={`text-3xl font-bold ${hasConfidence ? confidenceColor : ""}`} data-testid="text-confidence-score">
                  {hasConfidence ? `${avgConfidence}%` : "N/A"}
                </span>
                {hasConfidence && (
                  <span className="text-xs text-muted-foreground">
                    across {confidenceMetrics.totalScored} response{confidenceMetrics.totalScored !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {hasConfidence ? (
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-2">
                  <div
                    className={`h-full ${confidenceBarColor} rounded-full transition-all`}
                    style={{ width: `${avgConfidence}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2">Confidence scores are generated automatically for each AI response.</p>
              )}
            </div>

            {hasDist && (
              <div data-testid="section-confidence-distribution">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Confidence Distribution</span>
                <div className="mt-2 space-y-2">
                  {[
                    { key: "high", label: "High", range: "80-100%", count: confidenceDistribution.high, icon: CircleCheck, color: "text-green-600 dark:text-green-400", barColor: "bg-green-500 dark:bg-green-400" },
                    { key: "medium", label: "Medium", range: "50-79%", count: confidenceDistribution.medium, icon: CircleAlert, color: "text-yellow-600 dark:text-yellow-400", barColor: "bg-yellow-500 dark:bg-yellow-400" },
                    { key: "low", label: "Low", range: "0-49%", count: confidenceDistribution.low, icon: CircleX, color: "text-red-600 dark:text-red-400", barColor: "bg-red-500 dark:bg-red-400" },
                  ].map(bucket => {
                    const pct = confidenceDistribution.total > 0 ? Math.round((bucket.count / confidenceDistribution.total) * 100) : 0;
                    return (
                      <div key={bucket.key} data-testid={`confidence-bucket-${bucket.key}`}>
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <bucket.icon className={`w-3 h-3 ${bucket.color}`} />
                            <span className="text-xs font-medium">{bucket.label}</span>
                            <span className="text-[10px] text-muted-foreground">({bucket.range})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{bucket.count}</span>
                            <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                          </div>
                        </div>
                        <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${bucket.barColor}`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {confidenceDistribution.low > 0 && confidenceDistribution.total > 0 && Math.round((confidenceDistribution.low / confidenceDistribution.total) * 100) > 20 && (
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-2 flex items-center gap-1">
                    <CircleAlert className="w-3 h-3" />
                    {Math.round((confidenceDistribution.low / confidenceDistribution.total) * 100)}% of responses have low confidence — consider uploading more detailed documents.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserBreakdownSection({ userBreakdown }: { userBreakdown: AdminUserMetrics[] }) {
  const activeUsers = userBreakdown.filter(u => u.status === "active").length;
  const loginOnlyUsers = userBreakdown.filter(u => u.status === "logged_in_only").length;
  const maxEngagement = Math.max(...userBreakdown.map(u => u.documentCount + u.questionsAsked), 1);

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-user-breakdown">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">User Breakdown</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{activeUsers} active</Badge>
          <Badge variant="secondary" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{loginOnlyUsers} login only</Badge>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="space-y-3">
          {userBreakdown.map((user) => {
            const engagement = user.documentCount + user.questionsAsked;
            const engagementPct = Math.max((engagement / maxEngagement) * 100, 4);
            const engagementLevel = engagement >= 20 ? "High" : engagement >= 5 ? "Medium" : engagement > 0 ? "Low" : "None";
            const engagementColor = engagement >= 20 ? "text-green-600 dark:text-green-400"
              : engagement >= 5 ? "text-yellow-600 dark:text-yellow-400"
              : engagement > 0 ? "text-orange-600 dark:text-orange-400"
              : "text-muted-foreground";
            const barColor = engagement >= 20 ? "bg-green-500 dark:bg-green-400"
              : engagement >= 5 ? "bg-yellow-500 dark:bg-yellow-400"
              : engagement > 0 ? "bg-orange-500 dark:bg-orange-400"
              : "bg-muted-foreground/30";

            return (
              <div key={user.userId} className="border-b border-border/30 pb-2.5 last:border-0 last:pb-0" data-testid={`row-user-${user.userId}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">{user.name}</span>
                      {user.email && <span className="text-[10px] text-muted-foreground block truncate">{user.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={user.status === "active" ? "default" : "secondary"} className="text-[10px] no-default-hover-elevate no-default-active-elevate" data-testid={`badge-status-${user.userId}`}>
                      {user.status === "active" ? "Active" : "Login Only"}
                    </Badge>
                  </div>
                </div>
                <div className="ml-8 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${engagementPct}%` }} />
                    </div>
                    <span className={`text-[10px] font-medium ${engagementColor} w-10 text-right`}>{engagementLevel}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5" />
                      {user.documentCount} doc{user.documentCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessagesSquare className="w-2.5 h-2.5" />
                      {user.conversationCount} chat{user.conversationCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-2.5 h-2.5" />
                      {user.questionsAsked} Q / {user.aiResponses} A
                    </span>
                    {user.lastActive && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(user.lastActive)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PersonalMetrics({ metrics, ratingMetrics, confidenceMetrics, confidenceDistribution, ratingTrend }: {
  metrics: MetricsData;
  ratingMetrics?: RatingMetrics;
  confidenceMetrics?: ConfidenceMetrics;
  confidenceDistribution?: ConfidenceDistribution;
  ratingTrend?: RatingTrendEntry[];
}) {
  const uploadDiff = metrics.uploadsThisWeek - metrics.uploadsLastWeek;
  const uploadLabel = uploadDiff > 0 ? `+${uploadDiff} vs last week` : uploadDiff < 0 ? `${uploadDiff} vs last week` : "Same as last week";

  return (
    <>
      <SummaryLine metrics={metrics} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Documents" value={metrics.totalDocuments} icon={FileText} trend={{ value: uploadDiff, label: uploadLabel }} />
        <StatCard title="Conversations" value={metrics.totalConversations} icon={MessagesSquare} subtitle={`${metrics.avgMessagesPerChat} msgs/chat avg`} />
        <StatCard title="Questions Asked" value={metrics.userMessages} icon={User} subtitle={`${metrics.totalMessages} total messages`} />
        <StatCard title="AI Responses" value={metrics.aiMessages} icon={MessageSquare} />
      </div>

      <AgentEvaluationSection ratingMetrics={ratingMetrics} confidenceMetrics={confidenceMetrics} confidenceDistribution={confidenceDistribution} ratingTrend={ratingTrend} />
    </>
  );
}

function AdminMetrics({ metrics, ratingMetrics, confidenceMetrics, confidenceDistribution, ratingTrend }: {
  metrics: AdminMetricsData;
  ratingMetrics?: RatingMetrics;
  confidenceMetrics?: ConfidenceMetrics;
  confidenceDistribution?: ConfidenceDistribution;
  ratingTrend?: RatingTrendEntry[];
}) {
  const uploadDiff = metrics.uploadsThisWeek - metrics.uploadsLastWeek;
  const uploadLabel = uploadDiff > 0 ? `+${uploadDiff} vs last week` : uploadDiff < 0 ? `${uploadDiff} vs last week` : "Same as last week";

  return (
    <>
      <SummaryLine metrics={metrics} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard title="Total Users" value={metrics.totalUsers} icon={Users} />
        <StatCard title="Documents" value={metrics.totalDocuments} icon={FileText} trend={{ value: uploadDiff, label: uploadLabel }} />
        <StatCard title="Conversations" value={metrics.totalConversations} icon={MessagesSquare} subtitle={`${metrics.avgMessagesPerChat} msgs/chat avg`} />
        <StatCard title="Questions Asked" value={metrics.userMessages} icon={User} subtitle={`${metrics.totalMessages} total messages`} />
        <StatCard title="AI Responses" value={metrics.aiMessages} icon={MessageSquare} />
      </div>

      <AgentEvaluationSection ratingMetrics={ratingMetrics} confidenceMetrics={confidenceMetrics} confidenceDistribution={confidenceDistribution} ratingTrend={ratingTrend} />

      <UserBreakdownSection userBreakdown={metrics.userBreakdown} />
    </>
  );
}

export default function Metrics() {
  const [view, setView] = useState<"personal" | "admin">("personal");

  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const { data: metrics, isLoading } = useQuery<MetricsData>({
    queryKey: ["/api/metrics"],
    enabled: view === "personal",
  });

  const { data: ratingMetrics } = useQuery<RatingMetrics>({
    queryKey: ["/api/ratings/metrics"],
    enabled: view === "personal",
  });

  const { data: confidenceMetrics } = useQuery<ConfidenceMetrics>({
    queryKey: ["/api/confidence/metrics"],
    enabled: view === "personal",
  });

  const { data: confidenceDistribution } = useQuery<ConfidenceDistribution>({
    queryKey: ["/api/confidence/distribution"],
    enabled: view === "personal",
  });

  const { data: ratingTrend } = useQuery<RatingTrendEntry[]>({
    queryKey: ["/api/ratings/trend"],
    enabled: view === "personal",
  });

  const { data: adminMetrics, isLoading: adminLoading } = useQuery<AdminMetricsData>({
    queryKey: ["/api/admin/metrics"],
    enabled: view === "admin" && !!adminCheck?.isAdmin,
  });

  const { data: adminRatingMetrics } = useQuery<RatingMetrics>({
    queryKey: ["/api/admin/ratings/metrics"],
    enabled: view === "admin" && !!adminCheck?.isAdmin,
  });

  const { data: adminConfidenceMetrics } = useQuery<ConfidenceMetrics>({
    queryKey: ["/api/admin/confidence/metrics"],
    enabled: view === "admin" && !!adminCheck?.isAdmin,
  });

  const { data: adminConfidenceDistribution } = useQuery<ConfidenceDistribution>({
    queryKey: ["/api/admin/confidence/distribution"],
    enabled: view === "admin" && !!adminCheck?.isAdmin,
  });

  const { data: adminRatingTrend } = useQuery<RatingTrendEntry[]>({
    queryKey: ["/api/admin/ratings/trend"],
    enabled: view === "admin" && !!adminCheck?.isAdmin,
  });

  const isAdmin = adminCheck?.isAdmin === true;
  const loading = view === "personal" ? isLoading : adminLoading;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const noData = view === "personal" ? !metrics : !adminMetrics;

  if (noData) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <BarChart3 className="w-14 h-14 text-primary/10 mb-3" />
        <h2 className="text-lg font-semibold mb-1.5">No metrics available</h2>
        <p className="text-sm text-muted-foreground">Upload documents and start chatting to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" data-testid="text-metrics-title">
              {view === "admin" ? "Admin Metrics" : "Metrics"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {view === "admin" ? "Platform-wide usage across all users" : "Your personal usage analytics"}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <Button
                variant={view === "personal" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("personal")}
                data-testid="button-view-personal"
              >
                <User className="w-3.5 h-3.5 mr-1.5" />
                My Metrics
              </Button>
              <Button
                variant={view === "admin" ? "default" : "outline"}
                size="sm"
                onClick={() => setView("admin")}
                data-testid="button-view-admin"
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                All Users
              </Button>
            </div>
          )}
        </div>

        {view === "personal" && metrics && (
          <PersonalMetrics
            metrics={metrics}
            ratingMetrics={ratingMetrics}
            confidenceMetrics={confidenceMetrics}
            confidenceDistribution={confidenceDistribution}
            ratingTrend={ratingTrend}
          />
        )}
        {view === "admin" && adminMetrics && (
          <AdminMetrics
            metrics={adminMetrics}
            ratingMetrics={adminRatingMetrics}
            confidenceMetrics={adminConfidenceMetrics}
            confidenceDistribution={adminConfidenceDistribution}
            ratingTrend={adminRatingTrend}
          />
        )}
      </div>
    </div>
  );
}
