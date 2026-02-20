import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, MessagesSquare, Bot, User, Users, BarChart3, Loader2, Shield, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, Minus, Search, Clock, Gauge } from "lucide-react";
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
  mostQueriedDocs: { id: number; title: string; queryCount: number; fileType: string; totalMessages: number }[];
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
  documentsByType: { type: string; count: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
  mostQueriedDocs: { id: number; title: string; queryCount: number; fileType: string; totalMessages: number }[];
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

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "Word",
  ppt: "PowerPoint",
  xlsx: "Excel",
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

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  doc: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ppt: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  xlsx: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  other: "bg-muted text-muted-foreground",
};

const BAR_COLORS = ["hsl(246, 80%, 60%)", "hsl(200, 70%, 50%)", "hsl(150, 60%, 45%)", "hsl(30, 80%, 55%)", "hsl(330, 70%, 55%)"];

function MostQueriedSection({ docs }: { docs: { id: number; title: string; queryCount: number; fileType: string; totalMessages: number }[] }) {
  const maxCount = Math.max(...docs.map(d => d.queryCount), 1);
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden" data-testid="card-most-queried">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Most Queried Documents</span>
        </div>
        {docs.length > 0 && (
          <span className="text-[10px] text-muted-foreground">{docs.reduce((s, d) => s + d.queryCount, 0)} total chats</span>
        )}
      </div>
      <div className="px-4 py-3">
        {docs.length > 0 ? (
          <div className="space-y-3">
            {docs.map((doc, idx) => {
              const barWidth = Math.max((doc.queryCount / maxCount) * 100, 8);
              const typeKey = doc.fileType?.includes("pdf") ? "pdf"
                : doc.fileType?.includes("word") || doc.fileType?.includes("msword") ? "doc"
                : doc.fileType?.includes("presentation") || doc.fileType?.includes("powerpoint") ? "ppt"
                : doc.fileType?.includes("spreadsheet") || doc.fileType?.includes("excel") ? "xlsx"
                : "other";
              const typeLabel = TYPE_LABELS[typeKey] || "File";
              const typeColor = FILE_TYPE_COLORS[typeKey] || FILE_TYPE_COLORS.other;
              return (
                <div key={doc.id} data-testid={`text-queried-doc-${doc.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">#{idx + 1}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeColor} shrink-0`}>{typeLabel}</span>
                    <span className="text-sm truncate flex-1 font-medium">{doc.title}</span>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidth}%`, background: BAR_COLORS[idx % BAR_COLORS.length] }}
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold">{doc.queryCount}</span>
                      <span className="text-[10px] text-muted-foreground">chat{doc.queryCount !== 1 ? "s" : ""}</span>
                      <span className="text-muted-foreground/40 text-[10px]">|</span>
                      <span className="text-[10px] text-muted-foreground">{doc.totalMessages} Q</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No documents queried yet</p>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
        {confidenceMetrics && <ConfidenceCard confidenceMetrics={confidenceMetrics} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MostQueriedSection docs={metrics.mostQueriedDocs} />

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

function AdminMetrics({ metrics, ratingMetrics, confidenceMetrics }: { metrics: AdminMetricsData; ratingMetrics?: RatingMetrics; confidenceMetrics?: ConfidenceMetrics }) {
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
        {confidenceMetrics && <ConfidenceCard confidenceMetrics={confidenceMetrics} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MostQueriedSection docs={metrics.mostQueriedDocs} />
        <UserBreakdownSection userBreakdown={metrics.userBreakdown} totalDocuments={metrics.totalDocuments} totalMessages={metrics.totalMessages} />
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
