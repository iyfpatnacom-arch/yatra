"use client";

import { useEffect, useRef, useState } from "react";
import { IdCard, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage, formatBytes } from "@/lib/compress-image";
import {
  ACCEPTED_ID_PROOF_TYPES,
  MAX_ID_PROOF_BYTES,
  MAX_ID_PROOF_KB,
} from "@/lib/config";
import { format } from "@/lib/i18n";

/**
 * Uncontrolled-ish file picker wired into react-hook-form through a
 * Controller. Holds a File in form state (not a FileList) and renders a
 * local preview so the traveller can see they picked the right photo.
 */
export function IdProofField({ value, onChange, dict, inputId, invalid }) {
  const inputRef = useRef(null);
  const limitLabel = `${MAX_ID_PROOF_KB} KB`;
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    // Allow re-picking the same file after a removal.
    event.target.value = "";
    if (!file) return;

    setLocalError(null);

    if (!ACCEPTED_ID_PROOF_TYPES.includes(file.type)) {
      setLocalError(dict.errors.idproof_type);
      onChange(null);
      return;
    }

    setBusy(true);
    try {
      const compressed = await compressImage(file, MAX_ID_PROOF_BYTES);
      if (compressed.size > MAX_ID_PROOF_BYTES) {
        // The ladder in compressImage bottomed out and the photo still does
        // not fit — say so with the real number rather than "too large".
        setLocalError(
          format(dict.errors.idproof_max, { size: limitLabel })
        );
        onChange(null);
        return;
      }
      onChange(compressed);
    } finally {
      setBusy(false);
    }
  }

  function clear() {
    setLocalError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_ID_PROOF_TYPES.join(",")}
        onChange={handleFile}
        className="sr-only"
        aria-invalid={invalid || Boolean(localError) || undefined}
      />

      {value && preview ? (
        <div className="flex items-center gap-3 rounded-xl border border-tulsi/35 bg-tulsi/6 p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview, not a remote asset */}
          <img
            src={preview}
            alt=""
            className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-border"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {value.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(value.size)}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              {dict.form.fields.idProofChange}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={clear}
              aria-label={dict.form.fields.idProofRemove}
            >
              <X className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`flex w-full items-center gap-3 rounded-xl border border-dashed px-3.5 py-3 text-left transition-colors ${
            invalid || localError
              ? "border-destructive/60 bg-destructive/5"
              : "border-saffron/40 bg-saffron/4 hover:border-saffron hover:bg-saffron/8"
          }`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-saffron/15 text-saffron-deep dark:text-saffron">
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <IdCard className="size-4" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">
              {busy
                ? dict.form.fields.idProofCompressing
                : dict.form.fields.idProofCta}
            </span>
            <span className="block text-xs leading-snug text-muted-foreground">
              {format(dict.form.fields.idProofHint, { size: limitLabel })}
            </span>
          </span>
          <Upload
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      )}

      {localError ? (
        <p role="alert" className="text-sm text-destructive">
          {localError}
        </p>
      ) : null}
    </div>
  );
}
