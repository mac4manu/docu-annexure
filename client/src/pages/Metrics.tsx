import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquare, MessagesSquare, Bot, User, BarChart3, Loader2 } from "lucide-react";
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

export default function Metrics() {
  const { data: metrics, isLoading } = useQuery<MetricsData>({
    queryKey: ["/api/metrics"],
  });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <BarChart3 className="w-14 h-14 text-primary/10 mb-3" />
        <h2 className="text-lg font-semibold mb-1.5">No metrics available</h2>
        <p className="text-sm text-muted-foreground">Upload documents and start chatting to see analytics.</p>
      </div>
    );
  }

  const pieData = metrics.documentsByType.map(d => ({
    name: TYPE_LABELS[d.type] || d.type,
    value: d.count,
  }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-metrics-title">Metrics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">See how DocuAnnexure is being used</p>
        </div>

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
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        fontSize: "12px",
                      }}
                    />
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
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_entry, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          fontSize: "12px",
                        }}
                      />
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
      </div>
    </div>
  );
}
