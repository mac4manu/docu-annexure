import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, MessagesSquare, Bot, User, Users, BarChart3, Loader2, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface MetricsData {
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  documentsByType: { type: string; count: number }[];
  recentDocuments: { id: number; title: string; fileType: string; createdAt: string }[];
  recentConversations: { id: number; title: string; createdAt: string; messageCount: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
}

interface AdminUserMetrics {
  userId: string;
  email: string | null;
  name: string;
  documentCount: number;
  conversationCount: number;
  messageCount: number;
  lastActive: string | null;
}

interface AdminMetricsData {
  totalUsers: number;
  totalDocuments: number;
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  aiMessages: number;
  documentsByType: { type: string; count: number }[];
  activityByDay: { date: string; documents: number; conversations: number; messages: number }[];
  userBreakdown: AdminUserMetrics[];
}

const TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  doc: "Word",
  ppt: "PowerPoint",
  other: "Other",
};

const PIE_COLORS = ["hsl(246, 80%, 60%)", "hsl(200, 70%, 50%)", "hsl(150, 60%, 45%)", "hsl(30, 80%, 55%)"];

function StatCard({ title, value, icon: Icon, subtitle }: { title: string; value: number; icon: typeof FileText; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={`text-stat-${title.toLowerCase().replace(/\s/g, "-")}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function PersonalMetrics({ metrics }: { metrics: MetricsData }) {
  const pieData = metrics.documentsByType.map(d => ({
    name: TYPE_LABELS[d.type] || d.type,
    value: d.count,
  }));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Documents" value={metrics.totalDocuments} icon={FileText} />
        <StatCard title="Conversations" value={metrics.totalConversations} icon={MessagesSquare} />
        <StatCard title="User Messages" value={metrics.userMessages} icon={User} subtitle={`${metrics.totalMessages} total messages`} />
        <StatCard title="AI Responses" value={metrics.aiMessages} icon={Bot} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.activityByDay.some(d => d.documents > 0 || d.conversations > 0 || d.messages > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metrics.activityByDay} barGap={2}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
                  <Bar dataKey="documents" name="Documents" fill="hsl(246, 80%, 60%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="conversations" name="Chats" fill="hsl(200, 70%, 50%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="messages" name="Messages" fill="hsl(150, 60%, 45%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No activity in the last 7 days
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Document Types</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                      {pieData.map((_entry, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
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
              <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
                No documents uploaded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.recentDocuments.length > 0 ? (
              <div className="space-y-2">
                {metrics.recentDocuments.map(doc => (
                  <div key={doc.id} className="flex items-center gap-2.5 text-sm" data-testid={`text-recent-doc-${doc.id}`}>
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{doc.title}</span>
                    <Badge variant="secondary">{TYPE_LABELS[doc.fileType] || doc.fileType}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.recentConversations.length > 0 ? (
              <div className="space-y-2">
                {metrics.recentConversations.map(conv => (
                  <div key={conv.id} className="flex items-center gap-2.5 text-sm" data-testid={`text-recent-conv-${conv.id}`}>
                    <MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{conv.title}</span>
                    <Badge variant="secondary">{conv.messageCount} msg{conv.messageCount !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No conversations yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AdminMetrics({ metrics }: { metrics: AdminMetricsData }) {
  const pieData = metrics.documentsByType.map(d => ({
    name: TYPE_LABELS[d.type] || d.type,
    value: d.count,
  }));

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Users" value={metrics.totalUsers} icon={Users} />
        <StatCard title="Documents" value={metrics.totalDocuments} icon={FileText} />
        <StatCard title="Conversations" value={metrics.totalConversations} icon={MessagesSquare} />
        <StatCard title="User Messages" value={metrics.userMessages} icon={User} subtitle={`${metrics.totalMessages} total`} />
        <StatCard title="AI Responses" value={metrics.aiMessages} icon={Bot} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.activityByDay.some(d => d.documents > 0 || d.conversations > 0 || d.messages > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={metrics.activityByDay} barGap={2}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
                  <Bar dataKey="documents" name="Documents" fill="hsl(246, 80%, 60%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="conversations" name="Chats" fill="hsl(200, 70%, 50%)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="messages" name="Messages" fill="hsl(150, 60%, 45%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No activity in the last 7 days
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Document Types</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                      {pieData.map((_entry, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
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
              <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
                No documents uploaded yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">User Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-user-breakdown">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Docs</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Chats</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Messages</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {metrics.userBreakdown.map((user) => (
                  <tr key={user.userId} className="border-b border-border/50" data-testid={`row-user-${user.userId}`}>
                    <td className="py-2 pr-4">{user.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground truncate max-w-[200px]">{user.email || "-"}</td>
                    <td className="py-2 pr-4 text-right">{user.documentCount}</td>
                    <td className="py-2 pr-4 text-right">{user.conversationCount}</td>
                    <td className="py-2 pr-4 text-right">{user.messageCount}</td>
                    <td className="py-2 text-right text-muted-foreground text-xs">
                      {user.lastActive
                        ? new Date(user.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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

  const { data: adminMetrics, isLoading: adminLoading } = useQuery<AdminMetricsData>({
    queryKey: ["/api/admin/metrics"],
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
      <div className="max-w-5xl mx-auto p-6 space-y-6">
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

        {view === "personal" && metrics && <PersonalMetrics metrics={metrics} />}
        {view === "admin" && adminMetrics && <AdminMetrics metrics={adminMetrics} />}
      </div>
    </div>
  );
}
