import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, Mail, Users, ShieldCheck, Star, Check, MessageSquareHeart } from "lucide-react";

interface AllowedEmail {
  id: number;
  email: string;
  addedAt: string | null;
}

interface Testimonial {
  id: number;
  userName: string;
  userImage: string | null;
  role: string | null;
  content: string;
  rating: number;
  approved: boolean;
  createdAt: string;
}

export default function UserManagement() {
  const [newEmail, setNewEmail] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminCheck, isLoading: adminLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const { data: emails, isLoading: emailsLoading } = useQuery<AllowedEmail[]>({
    queryKey: ["/api/admin/allowed-emails"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: testimonials, isLoading: testimonialsLoading } = useQuery<Testimonial[]>({
    queryKey: ["/api/admin/testimonials"],
    enabled: adminCheck?.isAdmin === true,
  });

  const addMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/admin/allowed-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/allowed-emails"] });
      setNewEmail("");
      toast({ title: "User added", description: "Email has been added to the allowed list." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/allowed-emails/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove email");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/allowed-emails"] });
      toast({ title: "User removed", description: "Email has been removed from the allowed list." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove email", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/testimonials/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to approve");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({ title: "Approved", description: "Testimonial is now visible on the landing page." });
    },
  });

  const deleteTestimonialMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/testimonials/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["/api/testimonials"] });
      toast({ title: "Deleted", description: "Testimonial has been removed." });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    addMutation.mutate(trimmed);
  };

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-admin">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto" />
          <h2 className="text-lg font-semibold" data-testid="text-admin-denied">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6" data-testid="page-user-management">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Users className="w-6 h-6" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage which email addresses can access the application. Changes take effect immediately.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Add User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex gap-2" data-testid="form-add-email">
              <Input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
                data-testid="input-new-email"
              />
              <Button type="submit" disabled={addMutation.isPending || !newEmail.trim()} data-testid="button-add-email">
                {addMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-1.5" />
                )}
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Allowed Users
              {emails && (
                <Badge variant="secondary" className="ml-auto" data-testid="badge-user-count">
                  {emails.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emailsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : emails && emails.length > 0 ? (
              <div className="space-y-1" data-testid="list-allowed-emails">
                {emails.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-2 px-3 rounded-md hover-elevate group"
                    data-testid={`row-email-${item.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate" data-testid={`text-email-${item.id}`}>
                        {item.email}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.addedAt && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {new Date(item.addedAt).toLocaleDateString()}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMutation.mutate(item.id)}
                        disabled={removeMutation.isPending}
                        className="text-muted-foreground"
                        title="Remove user"
                        data-testid={`button-remove-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No users in the allowed list.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquareHeart className="w-4 h-4" />
              Testimonials
              {testimonials && (
                <Badge variant="secondary" className="ml-auto" data-testid="badge-testimonial-count">
                  {testimonials.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testimonialsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : testimonials && testimonials.length > 0 ? (
              <div className="space-y-3" data-testid="list-testimonials">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className="border border-border rounded-md p-4 space-y-3"
                    data-testid={`row-testimonial-${t.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{t.userName}</span>
                          {t.role && <span className="text-xs text-muted-foreground">({t.role})</span>}
                          {t.approved ? (
                            <Badge variant="default" className="text-xs bg-green-600" data-testid={`badge-approved-${t.id}`}>Approved</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs" data-testid={`badge-pending-${t.id}`}>Pending</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s <= t.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">"{t.content}"</p>
                    <div className="flex items-center gap-2">
                      {!t.approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate(t.id)}
                          disabled={approveMutation.isPending}
                          className="text-green-600 border-green-200 hover:bg-green-50"
                          data-testid={`button-approve-${t.id}`}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTestimonialMutation.mutate(t.id)}
                        disabled={deleteTestimonialMutation.isPending}
                        className="text-destructive"
                        data-testid={`button-delete-testimonial-${t.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-testimonials">No testimonials submitted yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
