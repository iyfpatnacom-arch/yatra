"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, LockOpen, OctagonX, Power } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { format } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATE_STYLES = {
  open: "bg-tulsi/15 text-tulsi border-tulsi/25",
  closed: "bg-gold/18 text-saffron-deep dark:text-gold border-gold/30",
  full: "bg-gold/18 text-saffron-deep dark:text-gold border-gold/30",
  stopped: "bg-destructive/12 text-destructive border-destructive/25",
};

/**
 * The three ways to stop new bookings: a planned close, a cap on paid
 * registrations, and the emergency stop. What each one refuses is spelled out
 * in lib/registration-gate.js; the hints here say the same in plain words.
 */
export function RegistrationControls({ lang, dict }) {
  const router = useRouter();
  const copy = dict.admin.controls;

  const [data, setData] = useState(null);
  const [limitText, setLimitText] = useState("");
  // Which control is saving, so only that one shows a spinner.
  const [saving, setSaving] = useState(null);

  function apply(result) {
    setData(result);
    setLimitText(result.settings.limit ? String(result.settings.limit) : "");
  }

  useEffect(() => {
    let current = true;
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace(`/${lang}/admin/login`);
          return;
        }
        const result = await response.json();
        if (current && result?.ok) apply(result);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [router, lang]);

  async function save(key, changes) {
    setSaving(key);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (response.status === 401) {
        router.replace(`/${lang}/admin/login`);
        return;
      }
      const result = await response.json();
      if (!response.ok || !result?.ok) throw new Error(result?.error);
      apply(result);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.failed);
    } finally {
      setSaving(null);
    }
  }

  function toggleOpen() {
    const open = !data.settings.open;
    if (!open && !window.confirm(copy.confirmClose)) return;
    save("open", { open });
  }

  function toggleKill() {
    const killSwitch = !data.settings.killSwitch;
    if (killSwitch && !window.confirm(copy.confirmKill)) return;
    save("kill", { killSwitch });
  }

  function saveLimit(event) {
    event.preventDefault();
    const text = limitText.trim();
    if (text === "") {
      save("limit", { limit: null });
      return;
    }
    const limit = Number(text);
    if (!/^\d+$/.test(text) || !Number.isInteger(limit) || limit < 1) {
      toast.error(copy.limitInvalid);
      return;
    }
    save("limit", { limit });
  }

  if (!data) {
    return (
      <section className="rounded-md border border-saffron/18 bg-card/80 p-4 backdrop-blur-sm">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {dict.admin.loading}
        </p>
      </section>
    );
  }

  const { settings, paid } = data;
  const state = data.reason || "open";
  const busy = saving !== null;

  return (
    <section className="rounded-md border border-saffron/18 bg-card/80 p-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-heading text-base font-semibold text-indigo-deep dark:text-foreground">
          {copy.heading}
        </h2>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-xs font-medium",
            STATE_STYLES[state]
          )}
        >
          {copy.state[state]}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums sm:ml-auto">
          {settings.limit
            ? format(copy.paidOfLimit, { paid, limit: settings.limit })
            : format(copy.paidNoLimit, { paid })}
        </span>
      </div>

      <Separator className="my-3 bg-saffron/15" />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={toggleOpen}
            disabled={busy}
            className="h-10 w-full rounded-md"
          >
            {saving === "open" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : settings.open ? (
              <Lock className="size-4" aria-hidden="true" />
            ) : (
              <LockOpen className="size-4" aria-hidden="true" />
            )}
            {settings.open ? copy.close : copy.reopen}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {copy.closeHint}
          </p>
        </div>

        <form onSubmit={saveLimit} className="space-y-2">
          <label htmlFor="registration-limit" className="sr-only">
            {copy.limitLabel}
          </label>
          <div className="flex gap-2">
            <Input
              id="registration-limit"
              inputMode="numeric"
              value={limitText}
              onChange={(event) =>
                setLimitText(event.target.value.replace(/[^\d]/g, ""))
              }
              placeholder={copy.limitPlaceholder}
              aria-label={copy.limitLabel}
              className="h-10 min-w-0 flex-1"
            />
            <Button
              type="submit"
              disabled={busy}
              className="h-10 rounded-md bg-gradient-to-r from-saffron to-saffron-deep"
            >
              {saving === "limit" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {limitText.trim() === "" && settings.limit
                ? copy.clearLimit
                : copy.saveLimit}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">{copy.limitLabel}.</span>{" "}
            {copy.limitHint}
          </p>
        </form>

        <div className="space-y-2">
          <Button
            type="button"
            variant={settings.killSwitch ? "outline" : "destructive"}
            onClick={toggleKill}
            disabled={busy}
            className="h-10 w-full rounded-md"
          >
            {saving === "kill" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : settings.killSwitch ? (
              <Power className="size-4" aria-hidden="true" />
            ) : (
              <OctagonX className="size-4" aria-hidden="true" />
            )}
            {settings.killSwitch ? copy.killOff : copy.killOn}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {copy.killHint}
          </p>
        </div>
      </div>
    </section>
  );
}
