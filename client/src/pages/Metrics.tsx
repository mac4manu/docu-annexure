import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, MessagesSquare, Bot, User, Users, BarChart3, Loader2, Shield, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus, Search, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface MetricsData {
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  avgMessagesPerChat: number;
  documentsByType: { type: string; count: number }[];
  recentDocuments: { id: number; title: string; fileType: string; createdAt: string }[];
  recentConversations: { id: number; title: string; createdAt: string; messageCount: number }[];
  mostQueriedDocs: { id: number; title: string; queryCount: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
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
}

interface AdminMetricsData {
  totalUsers: number;
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  avgMessagesPerChat: number;
  documentsByType: { type: string; count: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
  mostQueriedDocs: { id: number; title: string; queryCount: number }[];
  uploadsThisWeek: number;
  uploadsLastWeek: number;
  userBreakdown: AdminUserMetrics[];
}

interface RatingMetrics {
  thumbsUp: number;
  thumbsDown: number;
  total: number;
}

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "Word",
  ppt: "PowerPoint",
  other: "Other",
};

const PIE_COLORS = ["hsl(246, 80%, 60%)", "hsl(200, 70%, 50%)", "hsl(150, 60%, 45%)", "hsl(30, 80%, 55%)"];

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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
      </div>
      <div className="px-4 py-3">
        {children}
      </div>
    </div>
  );
}

function PersonalMetrics({ metrics, ratingMetrics }: { metrics: MetricsData; ratingMetrics?: RatingMetrics }) {
  const pieData = metrics.documentsByType.map(d => ({
    name: TYPE_LABELS[d.type] || d.type,
    value: d.count,
  }));

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
        <ChartCard title="Activity (Last 7 Days)">
          {metrics.activityByDay.some(d => d.documents > 0 || d.conversations > 0 || d.messages > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.activityByDay} barGap={2}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} />
                <Bar dataKey="documents" name="Docs" fill="hsl(246, 80%, 60%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="conversations" name="Chats" fill="hsl(200, 70%, 50%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="messages" name="Msgs" fill="hsl(150, 60%, 45%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No activity in the last 7 days
            </div>
          )}
        </ChartCard>

        <ChartCard title="Document Types">
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                    {pieData.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
              No documents uploaded yet
            </div>
          )}
        </ChartCard>

        {ratingMetrics && <RatingCard ratingMetrics={ratingMetrics} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-most-queried">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Most Queried Documents</span>
          </div>
          <div className="px-4 py-3">
            {metrics.mostQueriedDocs.length > 0 ? (
              <div className="space-y-2">
                {metrics.mostQueriedDocs.map((doc, idx) => (
                  <div key={doc.id} className="flex items-center gap-2.5 text-sm" data-testid={`text-queried-doc-${doc.id}`}>
                    <span className="text-xs text-muted-foreground font-medium w-4 shrink-0">{idx + 1}.</span>
                    <span className="truncate flex-1">{doc.title}</span>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{doc.queryCount} chat{doc.queryCount !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents queried yet</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-recent-docs">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Recent Documents</span>
          </div>
          <div className="px-4 py-3">
            {metrics.recentDocuments.length > 0 ? (
              <div className="space-y-2">
                {metrics.recentDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2.5 text-sm" data-testid={`text-recent-doc-${doc.id}`}>
                    <span className="truncate flex-1">{doc.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(doc.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents yet</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-recent-convos">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
            <MessagesSquare className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Recent Conversations</span>
          </div>
          <div className="px-4 py-3">
            {metrics.recentConversations.length > 0 ? (
              <div className="space-y-2">
                {metrics.recentConversations.map(conv => (
                  <div key={conv.id} className="flex items-center gap-2.5 text-sm" data-testid={`text-recent-conv-${conv.id}`}>
                    <span className="truncate flex-1">{conv.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(conv.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function AdminMetrics({ metrics, ratingMetrics }: { metrics: AdminMetricsData; ratingMetrics?: RatingMetrics }) {
  const pieData = metrics.documentsByType.map(d => ({
    name: TYPE_LABELS[d.type] || d.type,
    value: d.count,
  }));

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
        <ChartCard title="Platform Activity (Last 7 Days)">
          {metrics.activityByDay.some(d => d.documents > 0 || d.conversations > 0 || d.messages > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={metrics.activityByDay} barGap={2}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={25} />
                <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} />
                <Bar dataKey="documents" name="Docs" fill="hsl(246, 80%, 60%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="conversations" name="Chats" fill="hsl(200, 70%, 50%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="messages" name="Msgs" fill="hsl(150, 60%, 45%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No activity in the last 7 days
            </div>
          )}
        </ChartCard>

        <ChartCard title="Document Types">
          {pieData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                    {pieData.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                    <span className="font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
              No documents uploaded yet
            </div>
          )}
        </ChartCard>

        {ratingMetrics && <RatingCard ratingMetrics={ratingMetrics} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-most-queried">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Most Queried Documents</span>
          </div>
          <div className="px-4 py-3">
            {metrics.mostQueriedDocs.length > 0 ? (
              <div className="space-y-2">
                {metrics.mostQueriedDocs.map((doc, idx) => (
                  <div key={doc.id} className="flex items-center gap-2.5 text-sm" data-testid={`text-queried-doc-${doc.id}`}>
                    <span className="text-xs text-muted-foreground font-medium w-4 shrink-0">{idx + 1}.</span>
                    <span className="truncate flex-1">{doc.title}</span>
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">{doc.queryCount} chat{doc.queryCount !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents queried yet</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-user-breakdown">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">User Breakdown</span>
          </div>
          <div className="px-4 py-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-user-breakdown">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground text-xs">User</th>
                    <th className="text-right py-1.5 pr-3 font-medium text-muted-foreground text-xs">Docs</th>
                    <th className="text-right py-1.5 pr-3 font-medium text-muted-foreground text-xs">Chats</th>
                    <th className="text-right py-1.5 pr-3 font-medium text-muted-foreground text-xs">Q&A</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground text-xs">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.userBreakdown.map((user) => (
                    <tr key={user.userId} className="border-b border-border/50" data-testid={`row-user-${user.userId}`}>
                      <td className="py-1.5 pr-3">
                        <div className="font-medium text-xs">{user.name}</div>
                        {user.email && <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{user.email}</div>}
                      </td>
                      <td className="py-1.5 pr-3 text-right text-xs">{user.documentCount}</td>
                      <td className="py-1.5 pr-3 text-right text-xs">{user.conversationCount}</td>
                      <td className="py-1.5 pr-3 text-right text-xs">{user.questionsAsked}/{user.aiResponses}</td>
                      <td className="py-1.5 text-right text-muted-foreground text-[10px]">
                        {user.lastActive ? timeAgo(user.lastActive) : "Never"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
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

  const { data: adminMetrics, isLoading: adminLoading } = useQuery<AdminMetricsData>({
    queryKey: ["/api/admin/metrics"],
    enabled: view === "admin" && !!adminCheck?.isAdmin,
  });

  const { data: adminRatingMetrics } = useQuery<RatingMetrics>({
    queryKey: ["/api/admin/ratings/metrics"],
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

        {view === "personal" && metrics && <PersonalMetrics metrics={metrics} ratingMetrics={ratingMetrics} />}
        {view === "admin" && adminMetrics && <AdminMetrics metrics={adminMetrics} ratingMetrics={adminRatingMetrics} />}
      </div>
    </div>
  );
}
