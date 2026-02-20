import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, MessagesSquare, User, Users, BarChart3, Loader2, Shield, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus, Clock, Gauge, Layers, Eye, Type, Table2 } from "lucide-react";

interface MetricsData {
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  avgMessagesPerChat: number;
  documentsByComplexity: { complexity: string; count: number }[];
  totalPages: number;
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
  documentsByComplexity: { complexity: string; count: number }[];
  totalPages: number;
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

function StatCard({ title, value, icon: Icon, subtitle }: { title: string; value: string | number; icon: typeof FileText; subtitle?: string }) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid={`card-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{title}</span>
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </div>
      <div className="px-4 py-3">
        <div className="text-2xl font-bold" data-testid={`text-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function UploadTrendCard({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  const diff = thisWeek - lastWeek;
  const TrendIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const trendColor = diff > 0 ? "text-green-600 dark:text-green-400" : diff < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground";
  const trendLabel = diff > 0 ? `+${diff} vs prior 7 days` : diff < 0 ? `${diff} vs prior 7 days` : "Same as prior 7 days";

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-upload-trend">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Upload Trend</span>
        <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
      </div>
      <div className="px-4 py-3">
        <div className="text-2xl font-bold">{thisWeek}</div>
        <p className={`text-xs mt-1 ${trendColor}`}>{trendLabel}</p>
      </div>
    </div>
  );
}

function RatingCard({ ratingMetrics }: { ratingMetrics: RatingMetrics }) {
  const accuracy = ratingMetrics.total > 0
    ? Math.round((ratingMetrics.thumbsUp / ratingMetrics.total) * 100)
    : 0;

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-ai-accuracy">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-xs font-medium text-muted-foreground">AI Response Accuracy</span>
      </div>
      <div className="px-4 py-3">
        <div className="flex flex-col items-center gap-2.5">
          <div className="text-3xl font-bold" data-testid="text-accuracy-percentage">
            {ratingMetrics.total > 0 ? `${accuracy}%` : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            Based on {ratingMetrics.total} rating{ratingMetrics.total !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              <span className="font-medium" data-testid="text-thumbs-up-count">{ratingMetrics.thumbsUp}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThumbsDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              <span className="font-medium" data-testid="text-thumbs-down-count">{ratingMetrics.thumbsDown}</span>
            </div>
          </div>
          {ratingMetrics.total > 0 && (
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-green-600 dark:bg-green-400 rounded-full transition-all"
                style={{ width: `${accuracy}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfidenceCard({ confidenceMetrics }: { confidenceMetrics: ConfidenceMetrics }) {
  const score = confidenceMetrics.avgConfidence;
  const scoreColor = score >= 80 ? "text-green-600 dark:text-green-400"
    : score >= 50 ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400";
  const barColor = score >= 80 ? "bg-green-600 dark:bg-green-400"
    : score >= 50 ? "bg-yellow-600 dark:bg-yellow-400"
    : "bg-red-600 dark:bg-red-400";

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-ai-confidence">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">AI Confidence Score</span>
        <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="px-4 py-3">
        <div className="flex flex-col items-center gap-2.5">
          <div className={`text-3xl font-bold ${scoreColor}`} data-testid="text-confidence-score">
            {confidenceMetrics.totalScored > 0 ? `${score}%` : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">
            Avg across {confidenceMetrics.totalScored} response{confidenceMetrics.totalScored !== 1 ? "s" : ""}
          </p>
          {confidenceMetrics.totalScored > 0 && (
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${score}%` }}
              />
            </div>
          )}
        </div>
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


const COMPLEXITY_CONFIG: Record<string, { label: string; description: string; icon: typeof Eye; color: string; barColor: string }> = {
  complex: { label: "Complex", description: "AI Vision extraction (tables, images, formulas)", icon: Eye, color: "text-purple-600 dark:text-purple-400", barColor: "bg-purple-500 dark:bg-purple-400" },
  structured: { label: "Structured", description: "Spreadsheet data with tables and formulas", icon: Table2, color: "text-green-600 dark:text-green-400", barColor: "bg-green-500 dark:bg-green-400" },
  simple: { label: "Simple", description: "Text-based extraction", icon: Type, color: "text-blue-600 dark:text-blue-400", barColor: "bg-blue-500 dark:bg-blue-400" },
};

function DocumentComplexityCard({ documentsByComplexity, totalDocuments, totalPages }: { documentsByComplexity: { complexity: string; count: number }[]; totalDocuments: number; totalPages: number }) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-doc-complexity">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Document Complexity</span>
        </div>
        {totalPages > 0 && (
          <span className="text-[10px] text-muted-foreground">{totalPages} total pages</span>
        )}
      </div>
      <div className="px-4 py-3">
        {documentsByComplexity.length > 0 ? (
          <div className="space-y-3">
            {["complex", "structured", "simple"].map(key => {
              const entry = documentsByComplexity.find(d => d.complexity === key);
              if (!entry) return null;
              const config = COMPLEXITY_CONFIG[key] || COMPLEXITY_CONFIG.simple;
              const Icon = config.icon;
              const pct = totalDocuments > 0 ? Math.round((entry.count / totalDocuments) * 100) : 0;
              return (
                <div key={key} data-testid={`complexity-${key}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{entry.count}</span>
                      <span className="text-[10px] text-muted-foreground">({pct}%)</span>
                    </div>
                  </div>
                  <div className="bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${config.barColor}`}
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{config.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
        )}
      </div>
    </div>
  );
}


function UserBreakdownSection({ userBreakdown, totalDocuments, totalMessages }: { userBreakdown: AdminUserMetrics[]; totalDocuments: number; totalMessages: number }) {
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

function PersonalMetrics({ metrics, ratingMetrics, confidenceMetrics }: { metrics: MetricsData; ratingMetrics?: RatingMetrics; confidenceMetrics?: ConfidenceMetrics }) {
  return (
    <>
      <SummaryLine metrics={metrics} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard title="Documents" value={metrics.totalDocuments} icon={FileText} />
        <StatCard title="Conversations" value={metrics.totalConversations} icon={MessagesSquare} />
        <StatCard title="Questions Asked" value={metrics.userMessages} icon={User} subtitle={`${metrics.totalMessages} total messages`} />
        <StatCard title="Avg per Chat" value={metrics.avgMessagesPerChat} icon={MessageSquare} subtitle="messages per conversation" />
        <UploadTrendCard thisWeek={metrics.uploadsThisWeek} lastWeek={metrics.uploadsLastWeek} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DocumentComplexityCard documentsByComplexity={metrics.documentsByComplexity} totalDocuments={metrics.totalDocuments} totalPages={metrics.totalPages} />
        {ratingMetrics && <RatingCard ratingMetrics={ratingMetrics} />}
        {confidenceMetrics && <ConfidenceCard confidenceMetrics={confidenceMetrics} />}
      </div>
    </>
  );
}

function AdminMetrics({ metrics, ratingMetrics, confidenceMetrics }: { metrics: AdminMetricsData; ratingMetrics?: RatingMetrics; confidenceMetrics?: ConfidenceMetrics }) {
  return (
    <>
      <SummaryLine metrics={metrics} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard title="Total Users" value={metrics.totalUsers} icon={Users} />
        <StatCard title="Documents" value={metrics.totalDocuments} icon={FileText} />
        <StatCard title="Conversations" value={metrics.totalConversations} icon={MessagesSquare} />
        <StatCard title="Questions Asked" value={metrics.userMessages} icon={User} subtitle={`${metrics.totalMessages} total msgs`} />
        <StatCard title="Avg per Chat" value={metrics.avgMessagesPerChat} icon={MessageSquare} subtitle="messages per conversation" />
        <UploadTrendCard thisWeek={metrics.uploadsThisWeek} lastWeek={metrics.uploadsLastWeek} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <DocumentComplexityCard documentsByComplexity={metrics.documentsByComplexity} totalDocuments={metrics.totalDocuments} totalPages={metrics.totalPages} />
        {ratingMetrics && <RatingCard ratingMetrics={ratingMetrics} />}
        {confidenceMetrics && <ConfidenceCard confidenceMetrics={confidenceMetrics} />}
      </div>

      <UserBreakdownSection userBreakdown={metrics.userBreakdown} totalDocuments={metrics.totalDocuments} totalMessages={metrics.totalMessages} />
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

        {view === "personal" && metrics && <PersonalMetrics metrics={metrics} ratingMetrics={ratingMetrics} confidenceMetrics={confidenceMetrics} />}
        {view === "admin" && adminMetrics && <AdminMetrics metrics={adminMetrics} ratingMetrics={adminRatingMetrics} confidenceMetrics={adminConfidenceMetrics} />}
      </div>
    </div>
  );
}
