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
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { TravellerFields } from "@/components/registration/traveller-fields";
import { CoachField } from "@/components/registration/coach-field";
import { AdvanceSummary } from "@/components/registration/advance-summary";
import {
  checkFacilitators,
  newTraveller,
  travellerSchema,
} from "@/lib/schema";
import {
  ACCEPTED_ID_PROOF_TYPES,
  calculateFee,
  COACH_CLASSES,
  formatINR,
  MAX_ID_PROOF_BYTES,
  MAX_MEMBERS,
  REGISTRATION_TYPES,
} from "@/lib/config";
import { cn } from "@/lib/utils";
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
    type: z.enum(REGISTRATION_TYPES, { error: "type_required" }),
    coach: z.enum(COACH_CLASSES, { error: "coach_required" }).optional(),
    travellers: z
      .array(travellerSchema.extend({ idProof: idProofSchema }))
      .min(1, "travellers_min")
      .max(MAX_MEMBERS, "travellers_max"),
  })
  .refine((data) => data.type !== "family" || Boolean(data.coach), {
    error: "coach_required",
    path: ["coach"],
  })
  /* The very function the server refines with, so the browser can never let
     through a facilitator the API is about to reject. */
  .superRefine(checkFacilitators)
  .refine(
    (data) =>
      data.type !== "youth" ||
      data.travellers.every((traveller) => traveller.gender === "male"),
    { error: "youth_male_only", path: ["travellers", 0, "gender"] }
  );

const CATEGORY = 0;
const DETAILS = 1;
const PAYMENT = 2;
const STEP_KEYS = ["category", "details", "payment"];

function Stepper({ step, labels, onJump }) {
  return (
    <ol className="flex w-full md:items-center gap-2">
      {STEP_KEYS.map((key, index) => {
        const done = index < step;
        const current = index === step;

        return (
          /* Only the items that carry a connector stretch: the last one is a
             bare circle, and stretching it too left a third of the row empty
             on a phone, where the labels are hidden. */
          <li
            key={key}
            className={cn(
              "flex min-w-0 items-center gap-2",
              index < STEP_KEYS.length - 1 && "flex-1"
            )}
          >
            <button
              type="button"
              onClick={done ? () => onJump(index) : undefined}
              disabled={!done}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex min-w-0 items-center gap-2 rounded-md py-1 text-left transition-colors",
                done && "hover:text-saffron-deep dark:hover:text-saffron"
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                  done && "bg-tulsi/20 text-tulsi",
                  current &&
                    "bg-gradient-to-br from-saffron to-saffron-deep text-white",
                  !done && !current && "bg-muted text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={cn(
                  "hidden truncate text-xs font-medium sm:block",
                  current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {labels[key]}
              </span>
            </button>

            {index < STEP_KEYS.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px flex-1 rounded-full transition-colors",
                  done ? "bg-tulsi/40" : "bg-border"
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CategoryCard({ icon: Icon, title, blurb, onClick, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/card flex w-full items-center gap-4 rounded-md border border-saffron/20 bg-card/80 p-4 text-left shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-saffron/50 hover:shadow-md hover:shadow-saffron/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron"
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-md bg-gradient-to-br",
          accent
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-heading text-lg font-semibold text-indigo-deep dark:text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">
          {blurb}
        </span>
      </span>
      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/card:translate-x-0.5 group-hover/card:text-saffron"
        aria-hidden="true"
      />
    </button>
  );
}

/**
 * Registration in three moves: who is travelling, their details, then the
 * amount and the gateway.
 *
 * The step split is what lets the form live in a fixed column beside the
 * photographs — a family of six filling one continuous scroll is what made the
 * single-page version unusable on a phone.
 */
export function RegistrationWizard({ lang, dict }) {
  const router = useRouter();
  const [step, setStep] = useState(CATEGORY);
  const [submitError, setSubmitError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  const form = useForm({
    resolver: zodResolver(clientSchema),
    mode: "onTouched",
    defaultValues: {
      type: undefined,
      coach: undefined,
      travellers: [newTraveller()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "travellers",
  });

  const type = useWatch({ control: form.control, name: "type" });
  const coach = useWatch({ control: form.control, name: "coach" });
  const travellers = useWatch({ control: form.control, name: "travellers" });

  const isFamily = type === "family";
  const travellerCount = fields.length;
  const canAdd = isFamily && travellerCount < MAX_MEMBERS;
  const isSubmitting = form.formState.isSubmitting;
  const copy = dict.wizard;

  // Only the booking amount is charged today, and it never depends on the
  // coach, so the button can name the exact figure before one is picked.
  const advanceDue = type
    ? calculateFee({ type, coach, travellerCount }).advanceDue
    : 0;

  /* Switching category changes how many travellers the form allows, so a real
     change starts from a clean slate rather than carrying half-filled rows
     across. Re-picking the same category keeps everything that was typed. */
  function chooseType(next) {
    if (next !== form.getValues("type")) {
      form.reset({
        type: next,
        coach: undefined,
        travellers: [newTraveller(next)],
      });
      setSubmitError(null);
    }
    setStep(DETAILS);
  }

  async function goToPayment() {
    const valid = await form.trigger("travellers", { shouldFocus: true });
    if (!valid) {
      setSubmitError(dict.form.fixErrors);
      return;
    }
    setSubmitError(null);
    setStep(PAYMENT);
  }

  function jumpTo(target) {
    setSubmitError(null);
    setStep(target);
  }

  async function onSubmit(values) {
    setSubmitError(null);

    const body = new FormData();
    body.append(
      "payload",
      JSON.stringify({
        type: values.type,
        ...(values.type === "family" ? { coach: values.coach } : {}),
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
      // Server-side field errors are pushed back onto the exact same paths, and
      // the visitor is returned to the step those fields live on.
      if (Array.isArray(result?.fieldErrors) && result.fieldErrors.length) {
        for (const issue of result.fieldErrors) {
          form.setError(issue.path, { type: "server", message: issue.key });
        }
        if (
          result.fieldErrors.some((issue) =>
            String(issue.path).startsWith("travellers")
          )
        ) {
          setStep(DETAILS);
        }
        setSubmitError(dict.form.fixErrors);
      } else {
        const message = translateError(dict, result?.error || "server_error");
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
    if (form.formState.errors.travellers) setStep(DETAILS);
  }

  return (
    <FormProvider {...form}>
      <div className="space-y-5">
        <Stepper step={step} labels={copy.steps} onJump={jumpTo} />

        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} noValidate>
          {step === CATEGORY ? (
            <div className="space-y-4">
              <header>
                <h2 className="font-heading text-xl font-semibold text-indigo-deep dark:text-foreground">
                  {copy.category.heading}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy.category.subheading}
                </p>
              </header>

              <div className="space-y-3">
                <CategoryCard
                  icon={UserRound}
                  title={copy.category.youth.title}
                  blurb={copy.category.youth.blurb}
                  accent="from-saffron/20 to-gold/10 text-saffron-deep dark:text-saffron"
                  onClick={() => chooseType("youth")}
                />
                <CategoryCard
                  icon={Users}
                  title={copy.category.family.title}
                  blurb={copy.category.family.blurb}
                  accent="from-indigo-krishna/20 to-lotus/10 text-indigo-krishna dark:text-lotus"
                  onClick={() => chooseType("family")}
                />
              </div>

              <p className="rounded-md border border-gold/25 bg-gold/8 px-4 py-3 text-sm text-saffron-deep dark:text-gold">
                {format(copy.category.advanceNote, {
                  amount: formatINR(
                    calculateFee({ type: "youth", travellerCount: 1 })
                      .advancePerPerson
                  ),
                })}
              </p>
            </div>
          ) : null}

          {step === DETAILS ? (
            <div className="space-y-4">
              <header className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-xl font-semibold text-indigo-deep dark:text-foreground">
                    {isFamily ? copy.details.family : copy.details.youth}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {copy.details.hint}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => jumpTo(CATEGORY)}
                  className="shrink-0 rounded-md"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  {copy.changeCategory}
                </Button>
              </header>

              {fields.map((field, index) => (
                <section
                  key={field.id}
                  className="rounded-md border border-saffron/18 bg-card/80 p-4 shadow-sm backdrop-blur-sm"
                >
                  <header className="mb-4 flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-saffron/15 text-saffron-deep dark:text-saffron">
                      {index === 0 ? (
                        <UserRound className="size-4" aria-hidden="true" />
                      ) : (
                        <Users className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <h3 className="font-heading text-base font-semibold text-indigo-deep dark:text-foreground">
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
                    onClick={() => append(newTraveller(type))}
                    disabled={!canAdd}
                    className="h-11 w-full rounded-md border-dashed border-saffron/45 text-saffron-deep hover:bg-saffron/8 dark:text-saffron"
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

              {submitError ? (
                <Alert variant="destructive">
                  <AlertTitle>{dict.form.errorTitle}</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="button"
                size="lg"
                onClick={goToPayment}
                className="h-12 w-full rounded-md bg-gradient-to-r from-saffron to-saffron-deep text-base shadow-lg shadow-saffron/20 hover:from-saffron-deep hover:to-saffron"
              >
                {copy.next}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          ) : null}

          {step === PAYMENT ? (
            <div className="space-y-4">
              <header>
                <h2 className="font-heading text-xl font-semibold text-indigo-deep dark:text-foreground">
                  {copy.payment.heading}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {copy.payment.hint}
                </p>
              </header>

              <div className="rounded-md border border-saffron/18 bg-card/80 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-semibold text-indigo-deep dark:text-foreground">
                    {isFamily
                      ? copy.category.family.title
                      : copy.category.youth.title}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => jumpTo(DETAILS)}
                    className="ml-auto rounded-md"
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    {copy.editDetails}
                  </Button>
                </div>
                <ol className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {(travellers || []).map((traveller, index) => (
                    <li key={index} className="truncate">
                      {index + 1}. {traveller?.name || "—"}
                    </li>
                  ))}
                </ol>
              </div>

              {isFamily ? <CoachField dict={dict} /> : null}

              <AdvanceSummary
                dict={dict}
                type={type}
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
                className="h-12 w-full rounded-md bg-gradient-to-r from-saffron to-saffron-deep text-base shadow-lg shadow-saffron/20 hover:from-saffron-deep hover:to-saffron"
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

              <Button
                type="button"
                variant="ghost"
                onClick={() => jumpTo(DETAILS)}
                disabled={isSubmitting}
                className="h-10 w-full rounded-md text-muted-foreground"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                {copy.back}
              </Button>
            </div>
          ) : null}
        </form>
      </div>
    </FormProvider>
  );
}
