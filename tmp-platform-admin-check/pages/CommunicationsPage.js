import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { companyService } from "@/services";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Checkbox } from "@/app/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Globe,
  History,
  Loader2,
  Mail,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Users,
  XCircle,
  AlertTriangle
} from "lucide-react";
const messageTemplates = [
  {
    key: "feature-release",
    label: "Feature Release",
    subject: "New features now live on StockManager",
    message: "We have released platform improvements that may affect your workspace. Please review your dashboard for the latest updates and feel free to reach out with any questions.",
    accent: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-800"
  },
  {
    key: "maintenance",
    label: "Scheduled Maintenance",
    subject: "Scheduled platform maintenance",
    message: "Our platform will undergo scheduled maintenance to improve performance and reliability. We expect brief downtime during the maintenance window. Thank you for your patience.",
    accent: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800"
  },
  {
    key: "policy-update",
    label: "Policy Update",
    subject: "Important policy update",
    message: "We are updating our terms of service and privacy policy to reflect new features and compliance requirements. Please review the changes in your account settings.",
    accent: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800"
  },
  {
    key: "payment-notice",
    label: "Payment Notice",
    subject: "Subscription payment reminder",
    message: "Your subscription payment is coming due. Please arrange payment to keep your access active and avoid any service interruption.",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
  },
  {
    key: "security-alert",
    label: "Security Alert",
    subject: "Security best practices reminder",
    message: "As part of our ongoing security efforts, we recommend reviewing your account security settings, enabling two-factor authentication, and ensuring your password is strong and unique.",
    accent: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
  }
];
function formatDate(value) {
  if (!value) return "\u2014";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
function titleCase(value) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function EmailPreview({ subject, message }) {
  return /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900", children: [
    /* @__PURE__ */ jsx("div", { className: "border-b border-slate-100 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-white/5 dark:text-slate-500", children: "Email Preview" }),
    /* @__PURE__ */ jsxs("div", { className: "p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "mb-4 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-800 dark:bg-white/5 dark:text-slate-100", children: [
        "Subject: ",
        subject
      ] }),
      /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-slate-100 p-4 dark:border-white/5", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-[520px] space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-white/5", children: [
          /* @__PURE__ */ jsx("div", { className: "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md", children: /* @__PURE__ */ jsx(Megaphone, { className: "h-5 w-5" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-slate-900 dark:text-white", children: "StockManager Platform" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "no-reply@stockmanager.rw" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200", children: message.split("\n").map((paragraph, i) => /* @__PURE__ */ jsx("p", { children: paragraph }, i)) }),
        /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 p-4 text-center dark:from-indigo-950/30 dark:to-violet-950/20", children: /* @__PURE__ */ jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "You are receiving this because you are a registered tenant on StockManager." }) })
      ] }) })
    ] })
  ] });
}
function CommunicationsPage() {
  const [companies, setCompanies] = useState([]);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);
  const [broadcastAudience, setBroadcastAudience] = useState("all");
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
  const [broadcastSubject, setBroadcastSubject] = useState("Platform update from StockManager");
  const [broadcastMessage, setBroadcastMessage] = useState(
    "We have released platform improvements that may affect your workspace. Please review your dashboard for the latest updates."
  );
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("compose");
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashboardRes, historyRes] = await Promise.all([
        companyService.getPlatformDashboard(),
        companyService.getPlatformAuditLogs({ action: "company.platform_broadcast_sent", per_page: 50 })
      ]);
      setCompanies(dashboardRes.data.companies);
      if (historyRes.success) {
        setBroadcastHistory(
          historyRes.data.map((item) => ({
            _id: item._id,
            action: item.action,
            changes: item.changes || {},
            createdAt: item.createdAt
          }))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);
  const filteredCompanies = useMemo(() => {
    if (!search.trim()) return companies.filter((c) => c.approvalStatus === "approved");
    const q = search.toLowerCase();
    return companies.filter(
      (c) => c.approvalStatus === "approved" && (c.name.toLowerCase().includes(q) || c.email && c.email.toLowerCase().includes(q))
    );
  }, [companies, search]);
  const handleBroadcast = async () => {
    setError(null);
    setSuccessMessage(null);
    if (broadcastAudience === "selected" && !selectedCompanyIds.length) {
      setError("Select at least one company before sending a targeted broadcast.");
      return;
    }
    try {
      setActionLoading(true);
      const response = await companyService.broadcastPlatformUpdate({
        subject: broadcastSubject,
        message: broadcastMessage,
        companyIds: broadcastAudience === "selected" ? selectedCompanyIds : void 0
      });
      setSuccessMessage(
        response.data.sent ? `Broadcast sent successfully to ${response.data.recipients} tenant${response.data.recipients === 1 ? "" : "s"}.` : "Broadcast recorded, but no email recipients were available."
      );
      setBroadcastSubject("");
      setBroadcastMessage("");
      setSelectedCompanyIds([]);
      await loadData();
    } catch (e) {
      setError("Failed to send broadcast. Please try again.");
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };
  const toggleCompany = (id) => {
    setSelectedCompanyIds(
      (prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };
  const selectAll = () => {
    setSelectedCompanyIds(filteredCompanies.map((c) => c._id));
  };
  const clearAll = () => {
    setSelectedCompanyIds([]);
  };
  return /* @__PURE__ */ jsxs("div", { className: "w-full space-y-5", children: [
    /* @__PURE__ */ jsx("div", { className: "relative overflow-hidden rounded-xl border border-slate-200/60 bg-gradient-to-br from-violet-50 via-indigo-50 to-cyan-50 p-4 dark:from-violet-950/40 dark:via-indigo-950/30 dark:to-cyan-950/20 dark:border-white/10 sm:p-5 lg:p-6", children: /* @__PURE__ */ jsxs("div", { className: "relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700 dark:border-violet-800 dark:bg-violet-500/15 dark:text-violet-300", children: [
          /* @__PURE__ */ jsx(MessageSquare, { className: "h-3.5 w-3.5" }),
          "Broadcast Center"
        ] }),
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl", children: "Communications" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300", children: "Compose and send platform-wide announcements, maintenance notices, and policy updates to all tenants or targeted groups. Preview exactly how your message will look before sending." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsxs(
        Button,
        {
          variant: "outline",
          size: "sm",
          onClick: loadData,
          disabled: isLoading,
          className: "border-slate-200 bg-white/80 text-slate-700 backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10",
          children: [
            isLoading ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(RefreshCw, { className: "mr-2 h-4 w-4" }),
            "Refresh"
          ]
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx(Tabs, { value: tab, onValueChange: (v) => setTab(v), children: /* @__PURE__ */ jsxs(TabsList, { className: "h-auto w-full justify-start gap-1 overflow-x-auto bg-white/70 p-1 backdrop-blur dark:bg-white/5 sm:w-fit", children: [
      /* @__PURE__ */ jsxs(
        TabsTrigger,
        {
          value: "compose",
          className: "shrink-0 text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-500/15 dark:data-[state=active]:text-indigo-300",
          children: [
            /* @__PURE__ */ jsx(Send, { className: "mr-1.5 h-3.5 w-3.5" }),
            "Compose"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        TabsTrigger,
        {
          value: "history",
          className: "shrink-0 text-xs data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-500/15 dark:data-[state=active]:text-indigo-300",
          children: [
            /* @__PURE__ */ jsx(History, { className: "mr-1.5 h-3.5 w-3.5" }),
            "History",
            broadcastHistory.length > 0 && /* @__PURE__ */ jsx("span", { className: "ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300", children: broadcastHistory.length })
          ]
        }
      )
    ] }) }),
    tab === "compose" && /* @__PURE__ */ jsxs("div", { className: "grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-bold text-slate-900 dark:text-white", children: "Message Templates" }) }),
          /* @__PURE__ */ jsx(CardContent, { className: "space-y-3", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: messageTemplates.map((tmpl) => /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => {
                setBroadcastSubject(tmpl.subject);
                setBroadcastMessage(tmpl.message);
              },
              className: cn(
                "rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all hover:shadow-sm",
                tmpl.accent
              ),
              children: tmpl.label
            },
            tmpl.key
          )) }) })
        ] }),
        /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-bold text-slate-900 dark:text-white", children: "Audience" }) }),
          /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setBroadcastAudience("all"),
                  className: cn(
                    "flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                    broadcastAudience === "all" ? "border-indigo-300 bg-indigo-50 shadow-sm dark:border-indigo-700 dark:bg-indigo-500/10" : "border-slate-200 bg-white/50 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  ),
                  children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
                      /* @__PURE__ */ jsx(Globe, { className: "h-4 w-4 text-indigo-600 dark:text-indigo-400" }),
                      "All Tenants"
                    ] }),
                    /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
                      "Send to every approved company (",
                      companies.filter((c) => c.approvalStatus === "approved").length,
                      ")"
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: () => setBroadcastAudience("selected"),
                  className: cn(
                    "flex flex-col gap-2 rounded-xl border p-4 text-left transition-all",
                    broadcastAudience === "selected" ? "border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-700 dark:bg-emerald-500/10" : "border-slate-200 bg-white/50 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  ),
                  children: [
                    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [
                      /* @__PURE__ */ jsx(Users, { className: "h-4 w-4 text-emerald-600 dark:text-emerald-400" }),
                      "Selected Tenants"
                    ] }),
                    /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [
                      selectedCompanyIds.length,
                      " selected for targeted broadcast"
                    ] })
                  ]
                }
              )
            ] }),
            broadcastAudience === "selected" && /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-white/5", children: [
              /* @__PURE__ */ jsxs("div", { className: "mb-3 flex items-center justify-between gap-3", children: [
                /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
                  /* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      placeholder: "Search tenants...",
                      value: search,
                      onChange: (e) => setSearch(e.target.value),
                      className: "border-slate-200 bg-white/80 pl-8 text-xs dark:border-white/10 dark:bg-[#0b111a]/60"
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
                  /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", className: "h-8 text-xs", onClick: selectAll, children: "All" }),
                  /* @__PURE__ */ jsx(Button, { size: "sm", variant: "ghost", className: "h-8 text-xs", onClick: clearAll, children: "None" })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "max-h-52 space-y-1 overflow-y-auto pr-1", children: filteredCompanies.map((company) => /* @__PURE__ */ jsxs(
                "label",
                {
                  className: "flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-white dark:hover:bg-white/5",
                  children: [
                    /* @__PURE__ */ jsx(
                      Checkbox,
                      {
                        checked: selectedCompanyIds.includes(company._id),
                        onCheckedChange: () => toggleCompany(company._id),
                        className: "border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:text-white dark:border-slate-600"
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
                      /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-slate-800 dark:text-slate-100", children: company.name }),
                      /* @__PURE__ */ jsx("p", { className: "text-[10px] text-slate-500 dark:text-slate-400", children: company.email || "No email" })
                    ] })
                  ]
                },
                company._id
              )) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-bold text-slate-900 dark:text-white", children: "Message" }) }),
          /* @__PURE__ */ jsxs(CardContent, { className: "space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs font-medium text-slate-700 dark:text-slate-200", children: "Subject" }),
              /* @__PURE__ */ jsx(
                Input,
                {
                  value: broadcastSubject,
                  onChange: (e) => setBroadcastSubject(e.target.value),
                  placeholder: "Enter broadcast subject...",
                  className: "border-slate-200 bg-white/80 text-sm dark:border-white/10 dark:bg-[#0b111a]/60 dark:text-white"
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { className: "text-xs font-medium text-slate-700 dark:text-slate-200", children: "Body" }),
              /* @__PURE__ */ jsx(
                Textarea,
                {
                  value: broadcastMessage,
                  onChange: (e) => setBroadcastMessage(e.target.value),
                  placeholder: "Type your message here...",
                  rows: 5,
                  className: "border-slate-200 bg-white/80 text-sm dark:border-white/10 dark:bg-[#0b111a]/60 dark:text-white"
                }
              )
            ] }),
            error && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200", children: [
              /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4" }),
              error
            ] }),
            successMessage && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200", children: [
              /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4" }),
              successMessage
            ] }),
            /* @__PURE__ */ jsxs(
              Button,
              {
                onClick: handleBroadcast,
                disabled: actionLoading || !broadcastSubject.trim() || !broadcastMessage.trim(),
                className: "w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-semibold text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50",
                children: [
                  actionLoading ? /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Send, { className: "mr-2 h-4 w-4" }),
                  broadcastAudience === "all" ? `Send to All Tenants (${companies.filter((c) => c.approvalStatus === "approved").length})` : `Send to ${selectedCompanyIds.length} Selected Tenant${selectedCompanyIds.length === 1 ? "" : "s"}`
                ]
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsx(EmailPreview, { subject: broadcastSubject, message: broadcastMessage }),
        /* @__PURE__ */ jsxs(Card, { className: "border-slate-200/60 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60", children: [
          /* @__PURE__ */ jsx(CardHeader, { className: "pb-3", children: /* @__PURE__ */ jsx(CardTitle, { className: "text-sm font-bold text-slate-900 dark:text-white", children: "Quick Stats" }) }),
          /* @__PURE__ */ jsxs(CardContent, { className: "grid grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-indigo-50 p-4 dark:bg-indigo-500/10", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300", children: "Total Tenants" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-bold text-indigo-900 dark:text-indigo-100", children: companies.length })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300", children: "Approved" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-100", children: companies.filter((c) => c.approvalStatus === "approved").length })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-sky-50 p-4 dark:bg-sky-500/10", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-300", children: "Emails Sent" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-bold text-sky-900 dark:text-sky-100", children: broadcastHistory.reduce((sum, h) => sum + (h.changes?.sent || 0), 0) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10", children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-300", children: "Total Broadcasts" }),
              /* @__PURE__ */ jsx("p", { className: "mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100", children: broadcastHistory.length })
            ] })
          ] })
        ] })
      ] })
    ] }),
    tab === "history" && /* @__PURE__ */ jsx("div", { className: "space-y-4", children: isLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-3", children: Array.from({ length: 5 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-20 rounded-xl" }, i)) }) : broadcastHistory.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 p-16 dark:border-white/10 dark:bg-white/5", children: [
      /* @__PURE__ */ jsx(History, { className: "mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" }),
      /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold text-slate-700 dark:text-slate-200", children: "No broadcasts yet" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Switch to Compose to send your first platform communication." })
    ] }) : broadcastHistory.map((item) => /* @__PURE__ */ jsx(
      Card,
      {
        className: "border-slate-200/60 bg-white/80 backdrop-blur-xl transition-all hover:shadow-sm dark:border-white/10 dark:bg-[#0f172a]/60",
        children: /* @__PURE__ */ jsxs(CardContent, { className: "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 space-y-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Mail, { className: "h-4 w-4 text-slate-400" }),
              /* @__PURE__ */ jsx("p", { className: "truncate text-sm font-bold text-slate-900 dark:text-white", children: item.changes?.subject || "Platform update" })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "line-clamp-2 text-xs text-slate-500 dark:text-slate-400", children: item.changes?.message || "" }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 pt-1", children: [
              item.changes?.recipients !== void 0 && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "border-indigo-200 bg-indigo-50 text-[10px] font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300", children: [
                /* @__PURE__ */ jsx(Users, { className: "mr-1 h-3 w-3" }),
                item.changes.recipients,
                " recipient",
                item.changes.recipients === 1 ? "" : "s"
              ] }),
              item.changes?.sent !== void 0 && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "border-emerald-200 bg-emerald-50 text-[10px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300", children: [
                /* @__PURE__ */ jsx(CheckCircle2, { className: "mr-1 h-3 w-3" }),
                item.changes.sent,
                " sent"
              ] }),
              item.changes?.failed !== void 0 && item.changes.failed > 0 && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "border-red-200 bg-red-50 text-[10px] font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300", children: [
                /* @__PURE__ */ jsx(XCircle, { className: "mr-1 h-3 w-3" }),
                item.changes.failed,
                " failed"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex-col sm:items-end", children: /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx(Clock, { className: "h-3.5 w-3.5" }),
            formatDate(item.createdAt)
          ] }) })
        ] })
      },
      item._id
    )) })
  ] });
}
export {
  CommunicationsPage as default
};
