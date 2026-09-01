"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { translateError } from "@/lib/i18n";

export function AdminLoginForm({ lang, dict }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    if (!password) {
      setError(dict.errors.password_required);
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(translateError(dict, result?.error || "server_error"));
        return;
      }

      router.replace(`/${lang}/admin`);
      router.refresh();
    } catch {
      setError(dict.errors.network_error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-md bg-gradient-to-br from-saffron/20 to-gold/12 text-saffron-deep dark:text-gold">
          <ShieldCheck className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-heading text-2xl font-bold text-indigo-deep dark:text-foreground">
          {dict.admin.loginTitle}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {dict.admin.loginSubtitle}
        </p>
      </div>

      <Field data-invalid={Boolean(error) || undefined}>
        <FieldLabel htmlFor="admin-password">{dict.admin.password}</FieldLabel>
        <div className="relative">
          <KeyRound
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(error) || undefined}
            className="h-11 pl-9"
          />
        </div>
        <FieldError>{error}</FieldError>
      </Field>

      <Button
        type="submit"
        disabled={busy}
        className="h-11 w-full rounded-md bg-gradient-to-r from-saffron to-saffron-deep text-base"
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {dict.admin.loggingIn}
          </>
        ) : (
          dict.admin.login
        )}
      </Button>
    </form>
  );
}
