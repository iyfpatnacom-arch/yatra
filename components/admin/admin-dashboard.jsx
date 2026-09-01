"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  IdCard,
  Loader2,
  LogOut,
  Search,
  Users,
  IndianRupee,
  ClipboardList,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatINR, PAYMENT_STATUSES, REGISTRATION_TYPES } from "@/lib/config";
import { format } from "@/lib/i18n";

const STATUS_STYLES = {
  success: "bg-tulsi/15 text-tulsi border-tulsi/25",
  pending: "bg-gold/18 text-saffron-deep dark:text-gold border-gold/30",
  failed: "bg-destructive/12 text-destructive border-destructive/25",
  aborted: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status, dict }) {
  return (
    <Badge
      variant="outline"
      className={`border ${STATUS_STYLES[status] || STATUS_STYLES.aborted}`}
    >
      {dict.admin.statuses[status] || status}
    </Badge>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-saffron/18 bg-card/80 p-4 backdrop-blur-sm">
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-md ${accent}`}
      >
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-xl font-bold tabular-nums text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatDate(value, lang) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AdminDashboard({ lang, dict }) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, status]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (type !== "all") params.set("type", type);
    if (status !== "all") params.set("status", status);
    return params.toString();
  }, [debouncedSearch, type, status]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams(queryString);
      params.set("page", String(page));
      const response = await fetch(`/api/admin/registrations?${params}`);

      if (response.status === 401) {
        router.replace(`/${lang}/admin/login`);
        return;
      }

      const result = await response.json();
      // Drop responses from filters the user has already moved past.
      if (requestId === requestRef.current && result?.ok) setData(result);
    } catch {
      if (requestId === requestRef.current) setData(null);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [queryString, page, router, lang]);

  useEffect(() => {
    load();
  }, [load]);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace(`/${lang}/admin/login`);
    router.refresh();
  }

  const rows = data?.rows || [];
  const stats = data?.stats;
  const totalPages = data?.totalPages || 1;
  const from = rows.length ? (page - 1) * (data?.pageSize || 25) + 1 : 0;
  const to = rows.length ? from + rows.length - 1 : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-indigo-deep sm:text-3xl dark:text-foreground">
            {dict.admin.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict.admin.subtitle}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          disabled={loggingOut}
          className="rounded-md"
        >
          {loggingOut ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="size-3.5" aria-hidden="true" />
          )}
          {dict.admin.logout}
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label={dict.admin.stats.registrations}
          value={stats?.registrations ?? "—"}
          accent="bg-saffron/15 text-saffron-deep dark:text-saffron"
        />
        <StatCard
          icon={Users}
          label={dict.admin.stats.travellers}
          value={stats?.travellers ?? "—"}
          accent="bg-indigo-krishna/15 text-indigo-krishna"
        />
        <StatCard
          icon={CheckCircle2}
          label={dict.admin.stats.paid}
          value={stats?.paid ?? "—"}
          accent="bg-tulsi/15 text-tulsi"
        />
        <StatCard
          icon={IndianRupee}
          label={dict.admin.stats.collected}
          value={stats ? formatINR(stats.collected) : "—"}
          accent="bg-gold/20 text-saffron-deep dark:text-gold"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-saffron/18 bg-card/80 p-3 backdrop-blur-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={dict.admin.search}
            aria-label={dict.admin.search}
            className="h-10 pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={type} onValueChange={(value) => setType(value ?? "all")}>
            <SelectTrigger
              className="h-10 flex-1 sm:w-36"
              aria-label={dict.admin.filterType}
            >
              <SelectValue>
                {(value) =>
                  value === "all"
                    ? `${dict.admin.filterType}: ${dict.admin.all}`
                    : dict.admin.types[value]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{dict.admin.all}</SelectItem>
              {REGISTRATION_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {dict.admin.types[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => setStatus(value ?? "all")}
          >
            <SelectTrigger
              className="h-10 flex-1 sm:w-40"
              aria-label={dict.admin.filterStatus}
            >
              <SelectValue>
                {(value) =>
                  value === "all"
                    ? `${dict.admin.filterStatus}: ${dict.admin.all}`
                    : dict.admin.statuses[value]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{dict.admin.all}</SelectItem>
              {PAYMENT_STATUSES.map((option) => (
                <SelectItem key={option} value={option}>
                  {dict.admin.statuses[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* A plain link, so the browser handles the download and the CSV
            inherits exactly the filters currently on screen. */}
        <Button
          render={
            <a
              href={`/api/admin/export${queryString ? `?${queryString}` : ""}`}
            />
          }
          className="h-10 rounded-md bg-gradient-to-r from-saffron to-saffron-deep"
        >
          <Download className="size-4" aria-hidden="true" />
          {dict.admin.downloadCsv}
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-saffron/18 bg-card/80 backdrop-blur-sm">
        {loading && !data ? (
          <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {dict.admin.loading}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {dict.admin.empty}
          </p>
        ) : (
          <>
            {/* Desktop: full table. */}
            <div className="hidden overflow-x-auto lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{dict.admin.table.orderId}</TableHead>
                    <TableHead>{dict.admin.table.name}</TableHead>
                    <TableHead>{dict.admin.table.type}</TableHead>
                    <TableHead>{dict.admin.table.coach}</TableHead>
                    <TableHead>{dict.admin.table.contact}</TableHead>
                    <TableHead>{dict.admin.table.facilitator}</TableHead>
                    <TableHead className="text-right">
                      {dict.admin.table.members}
                    </TableHead>
                    <TableHead className="text-right">
                      {dict.admin.table.amount}
                    </TableHead>
                    <TableHead className="text-right">
                      {dict.admin.table.balance}
                    </TableHead>
                    <TableHead>{dict.admin.table.status}</TableHead>
                    <TableHead>{dict.admin.table.createdAt}</TableHead>
                    <TableHead className="text-right">
                      {dict.admin.table.actions}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.orderId}>
                      <TableCell className="font-mono text-xs">
                        {row.orderId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.travellers[0]?.name}
                      </TableCell>
                      <TableCell>{dict.admin.types[row.type]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.coach ? dict.admin.coaches[row.coach] : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.travellers[0]?.phone}
                      </TableCell>
                      <TableCell>{row.travellers[0]?.facilitator}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.travellerCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(row.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.balanceDue > 0 ? formatINR(row.balanceDue) : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} dict={dict} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(row.createdAt, lang)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelected(row)}
                        >
                          <Eye className="size-3.5" aria-hidden="true" />
                          {dict.admin.table.view}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: one card per registration. */}
            <ul className="divide-y divide-border lg:hidden">
              {rows.map((row) => (
                <li key={row.orderId} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {row.travellers[0]?.name}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {row.orderId}
                      </p>
                    </div>
                    <StatusBadge status={row.status} dict={dict} />
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground">
                        {dict.admin.table.contact}:
                      </dt>
                      <dd className="tabular-nums">{row.travellers[0]?.phone}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground">
                        {dict.admin.table.members}:
                      </dt>
                      <dd className="tabular-nums">{row.travellerCount}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground">
                        {dict.admin.table.type}:
                      </dt>
                      <dd>
                        {dict.admin.types[row.type]}
                        {row.coach
                          ? ` · ${dict.admin.coaches[row.coach]}`
                          : ""}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted-foreground">
                        {dict.admin.table.amount}:
                      </dt>
                      <dd className="tabular-nums">{formatINR(row.amount)}</dd>
                    </div>
                    {row.balanceDue > 0 ? (
                      <div className="flex gap-1.5">
                        <dt className="text-muted-foreground">
                          {dict.admin.table.balance}:
                        </dt>
                        <dd className="tabular-nums">
                          {formatINR(row.balanceDue)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(row)}
                    className="mt-3 w-full rounded-md"
                  >
                    <Eye className="size-3.5" aria-hidden="true" />
                    {dict.admin.table.view}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {data && rows.length > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {format(dict.admin.showing, { from, to, total: data.total })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              {dict.admin.prev}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              {dict.admin.next}
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      <RegistrationDialog
        row={selected}
        dict={dict}
        lang={lang}
        onClose={() => setSelected(null)}
        onSynced={load}
      />
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium break-all">{value || "—"}</dd>
    </div>
  );
}

/**
 * Payment facts plus the escape hatch for the row that never got a response
 * back from the gateway: ask CCAvenue directly what happened to this order.
 */
function PaymentPanel({ row, dict, onSynced }) {
  // Mounted with key={row.orderId}, so opening a different registration gets a
  // fresh panel instead of the previous row's result.
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);

  async function sync() {
    setSyncing(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: row.orderId }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setMessage({ ok: false, text: dict.admin.syncFailed });
        return;
      }

      const label = dict.admin.statuses[result.status] || result.status;
      setMessage({
        ok: true,
        text: format(
          result.changed ? dict.admin.syncUpdated : dict.admin.syncUnchanged,
          { status: label }
        ),
      });
      if (result.changed) onSynced?.();
    } catch {
      setMessage({ ok: false, text: dict.admin.syncFailed });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className="rounded-md border border-indigo-krishna/20 bg-background/60 p-4">
      <h3 className="font-heading text-sm font-semibold text-indigo-krishna">
        {dict.admin.paymentHeading}
      </h3>
      <Separator className="my-2.5 bg-indigo-krishna/15" />

      <dl className="divide-y divide-border/60">
        <DetailRow label={dict.admin.trackingId} value={row.trackingId} />
        <DetailRow label={dict.admin.bankRefNo} value={row.bankRefNo} />
        <DetailRow label={dict.admin.paymentMode} value={row.paymentMode} />
        {row.failureMessage ? (
          <DetailRow
            label={dict.admin.failureReason}
            value={row.failureMessage}
          />
        ) : null}
        <DetailRow
          label={dict.admin.whatsappStatus}
          value={
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="size-3.5" aria-hidden="true" />
              {row.notificationsPaused
                ? dict.admin.whatsappPaused
                : row.confirmationSent
                  ? dict.admin.sent
                  : dict.admin.notSent}
            </span>
          }
        />
      </dl>

      {row.amountMismatch ? (
        <p className="mt-3 flex gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {dict.admin.amountMismatch}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={sync}
        disabled={syncing}
        className="mt-3 w-full rounded-md"
      >
        {syncing ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="size-3.5" aria-hidden="true" />
        )}
        {syncing ? dict.admin.syncing : dict.admin.syncPayment}
      </Button>

      {message ? (
        <p
          className={`mt-2 text-xs ${message.ok ? "text-muted-foreground" : "text-destructive"}`}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}

function RegistrationDialog({ row, dict, lang, onClose, onSynced }) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dict.admin.detailsTitle}</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {row?.orderId}
          </DialogDescription>
        </DialogHeader>

        {row ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={row.status} dict={dict} />
              <Badge variant="secondary">{dict.admin.types[row.type]}</Badge>
              {row.coach ? (
                <Badge variant="secondary">
                  {dict.admin.coaches[row.coach]}
                </Badge>
              ) : null}
              <Badge variant="outline">{formatINR(row.amount)}</Badge>
              {row.balanceDue > 0 ? (
                <Badge variant="outline" className="text-muted-foreground">
                  {dict.admin.table.balance}: {formatINR(row.balanceDue)}
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatDate(row.createdAt, lang)}
              </span>
            </div>

            <PaymentPanel
              key={row.orderId}
              row={row}
              dict={dict}
              onSynced={onSynced}
            />

            {row.travellers.map((traveller, index) => (
              <section
                key={`${row.orderId}-${index}`}
                className="rounded-md border border-saffron/18 bg-background/60 p-4"
              >
                <h3 className="font-heading text-sm font-semibold text-saffron-deep dark:text-gold">
                  {index === 0
                    ? dict.form.primaryTraveller
                    : format(dict.form.memberN, { n: index + 1 })}
                </h3>
                <Separator className="my-2.5 bg-saffron/15" />

                <dl className="divide-y divide-border/60">
                  <DetailRow label={dict.admin.table.name} value={traveller.name} />
                  <DetailRow label="Email" value={traveller.email} />
                  <DetailRow
                    label={dict.admin.table.contact}
                    value={traveller.phone}
                  />
                  <DetailRow
                    label={dict.admin.table.whatsapp}
                    value={traveller.whatsapp}
                  />
                  <DetailRow
                    label={dict.admin.table.facilitator}
                    value={traveller.facilitator}
                  />
                  <DetailRow
                    label={dict.admin.table.rounds}
                    value={traveller.chantingRounds}
                  />
                  <DetailRow label={dict.admin.table.dob} value={traveller.dob} />
                  <DetailRow
                    label={dict.admin.table.gender}
                    value={dict.form.genders[traveller.gender]}
                  />
                </dl>

                {traveller.idProofFileId ? (
                  <a
                    href={`/api/admin/id-proof/${traveller.idProofFileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex items-center gap-3 rounded-md border border-indigo-krishna/25 bg-indigo-krishna/6 p-2.5 transition-colors hover:border-indigo-krishna/50"
                  >
                    {/* Loaded through the admin-gated route, so it 404s for
                        anyone without a valid session cookie. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- authenticated blob route, not an optimisable asset */}
                    <img
                      src={`/api/admin/id-proof/${traveller.idProofFileId}`}
                      alt=""
                      loading="lazy"
                      className="size-14 shrink-0 rounded object-cover ring-1 ring-border"
                    />
                    <span className="flex items-center gap-1.5 text-sm font-medium text-indigo-krishna">
                      <IdCard className="size-4" aria-hidden="true" />
                      {dict.admin.table.idProof}
                    </span>
                  </a>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {dict.admin.table.idProof}: —
                  </p>
                )}
              </section>
            ))}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
