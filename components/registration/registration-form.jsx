"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useFieldArray,
  useForm,
  useWatch,
  FormProvider,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { TravellerFields } from "@/components/registration/traveller-fields";
import { CoachField } from "@/components/registration/coach-field";
import { PriceSummary } from "@/components/registration/price-summary";
import { travellerSchema, emptyTraveller } from "@/lib/schema";
import {
  ACCEPTED_ID_PROOF_TYPES,
  calculateFee,
  COACH_CLASSES,
  formatINR,
  MAX_ID_PROOF_BYTES,
  MAX_MEMBERS,
  REGISTRATION_TYPES,
} from "@/lib/config";
import { format, translateError } from "@/lib/i18n";
import { startPayment } from "@/lib/payment-redirect";

/**
 * The ID photo only exists on the client (it travels as a multipart part, not
 * as JSON), so the file rules live here while every text rule is reused from
 * the shared schema the server validates with.
 */
const idProofSchema = z
  .custom(
    (value) => typeof File !== "undefined" && value instanceof File,
    "idproof_required"
  )
  .refine((file) => ACCEPTED_ID_PROOF_TYPES.includes(file.type), "idproof_type")
  .refine((file) => file.size <= MAX_ID_PROOF_BYTES, "idproof_size");

const clientSchema = z
  .object({
    type: z.enum(REGISTRATION_TYPES),
    coach: z.enum(COACH_CLASSES, { error: "coach_required" }).optional(),
    travellers: z
      .array(travellerSchema.extend({ idProof: idProofSchema }))
      .min(1, "travellers_min")
      .max(MAX_MEMBERS, "travellers_max"),
  })
  .refine((data) => data.type !== "family" || Boolean(data.coach), {
    error: "coach_required",
    path: ["coach"],
  });

export function RegistrationForm({ mode, lang, dict }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);
  const isFamily = mode === "family";

  const form = useForm({
    resolver: zodResolver(clientSchema),
    mode: "onTouched",
    defaultValues: {
      type: mode,
      coach: undefined,
      travellers: [{ ...emptyTraveller }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "travellers",
  });

  const coach = useWatch({ control: form.control, name: "coach" });
  const travellerCount = fields.length;
  const canAdd = isFamily && travellerCount < MAX_MEMBERS;
  const isSubmitting = form.formState.isSubmitting;

  // Only the advance is charged today, and it never depends on the coach, so
  // the button can name the exact figure even before a family picks one.
  const advanceDue = calculateFee({
    type: mode,
    coach,
    travellerCount,
  }).advanceDue;

  async function onSubmit(values) {
    setSubmitError(null);

    const body = new FormData();
    body.append(
      "payload",
      JSON.stringify({
        type: values.type,
        ...(isFamily ? { coach: values.coach } : {}),
        travellers: values.travellers.map(({ idProof, ...rest }) => rest),
      })
    );
    values.travellers.forEach((traveller, index) => {
      body.append(`idProof_${index}`, traveller.idProof, traveller.idProof.name);
    });

    let response;
    try {
      response = await fetch("/api/register", {
        method: "POST",
        headers: { "x-yatra-locale": lang },
        body,
      });
    } catch {
      setSubmitError(dict.errors.network_error);
      toast.error(dict.errors.network_error);
      return;
    }

    const result = await response.json().catch(() => null);

    if (!response.ok || !result?.ok) {
      // Server-side field errors are pushed back onto the exact same paths.
      if (Array.isArray(result?.fieldErrors) && result.fieldErrors.length) {
        for (const issue of result.fieldErrors) {
          form.setError(issue.path, {
            type: "server",
            message: issue.key,
          });
        }
        setSubmitError(dict.form.fixErrors);
      } else {
        const message = translateError(
          dict,
          result?.error || "server_error"
        );
        setSubmitError(message);
        toast.error(message);
      }
      return;
    }

    toast.success(dict.form.successTitle);

    // The registration is saved either way. If the gateway is live we hand the
    // browser straight over to it; if it is not — or the handoff fails — the
    // visitor still lands on their status page and can pay from there.
    if (result.next === "payment") {
      setRedirecting(true);
      const payment = await startPayment({ orderId: result.orderId, lang });
      if (payment.ok) return;

      setRedirecting(false);
      toast.error(translateError(dict, payment.error));
    }

    router.push(`/${lang}/status/${result.orderId}`);
  }

  function onInvalid() {
    setSubmitError(dict.form.fixErrors);
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, onInvalid)}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
      >
        <div className="space-y-5">
          {isFamily ? <CoachField dict={dict} /> : null}

          {fields.map((field, index) => (
            <section
              key={field.id}
              className="rounded-2xl border border-saffron/18 bg-card/80 p-4 shadow-sm backdrop-blur-sm sm:p-6"
            >
              <header className="mb-4 flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-saffron/15 text-saffron-deep dark:text-saffron">
                  {index === 0 ? (
                    <UserRound className="size-4" aria-hidden="true" />
                  ) : (
                    <Users className="size-4" aria-hidden="true" />
                  )}
                </span>
                <h3 className="font-heading text-base font-semibold text-indigo-deep sm:text-lg dark:text-foreground">
                  {isFamily
                    ? index === 0
                      ? dict.form.primaryTraveller
                      : format(dict.form.memberN, { n: index + 1 })
                    : dict.form.travellerLabel}
                </h3>
                {isFamily && index > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="ml-auto text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    {dict.form.removeMember}
                  </Button>
                ) : null}
              </header>

              <Separator className="mb-5 bg-saffron/15" />
              <TravellerFields index={index} dict={dict} />
            </section>
          ))}

          {isFamily ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ ...emptyTraveller })}
                disabled={!canAdd}
                className="h-11 w-full rounded-xl border-dashed border-saffron/45 text-saffron-deep hover:bg-saffron/8 dark:text-saffron"
              >
                <Plus className="size-4" aria-hidden="true" />
                {dict.form.addMember}
              </Button>
              {!canAdd ? (
                <p className="text-center text-xs text-muted-foreground">
                  {format(dict.form.maxMembers, { n: MAX_MEMBERS })}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <PriceSummary
            dict={dict}
            type={mode}
            coach={coach}
            travellerCount={travellerCount}
          />

          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>{dict.form.errorTitle}</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-saffron to-saffron-deep text-base shadow-lg shadow-saffron/20 hover:from-saffron-deep hover:to-saffron"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {redirecting
                  ? dict.form.redirectingToPayment
                  : dict.form.submitting}
              </>
            ) : (
              format(dict.form.submit, { amount: formatINR(advanceDue) })
            )}
          </Button>
        </aside>
      </form>
    </FormProvider>
  );
}
