"use client";

import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { BedDouble, Snowflake } from "lucide-react";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { translateError } from "@/lib/i18n";

const COACHES = [
  { value: "sleeper", icon: BedDouble },
  { value: "ac", icon: Snowflake },
];

/**
 * Sleeper or AC, for a family booking.
 *
 * No fee is shown against either option on purpose: the booking amount is the
 * same whichever coach is picked, and the balance is settled with the
 * coordinator, so a price here would only invite the wrong comparison.
 */
export function CoachField({ dict }) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const uid = useId();

  const message = errors?.coach?.message;
  const error = message ? translateError(dict, message) : null;
  const copy = dict.form.coach;

  return (
    <FieldSet className="rounded-2xl border border-saffron/18 bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <FieldLegend className="font-heading text-base font-semibold text-indigo-deep dark:text-foreground">
        {copy.legend}
      </FieldLegend>
      <FieldDescription>{copy.hint}</FieldDescription>

      <Controller
        control={control}
        name="coach"
        render={({ field }) => (
          <Field data-invalid={Boolean(error) || undefined}>
            <RadioGroup
              value={field.value ?? null}
              onValueChange={field.onChange}
              aria-invalid={Boolean(error) || undefined}
              aria-label={copy.legend}
              className="grid gap-3 sm:grid-cols-2"
            >
              {COACHES.map(({ value, icon: Icon }) => (
                <label
                  key={value}
                  htmlFor={`${uid}-${value}`}
                  data-checked={field.value === value || undefined}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-saffron/20 bg-background/60 p-3.5 transition-colors hover:bg-saffron/6 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 data-checked:border-saffron/60 data-checked:bg-saffron/10"
                >
                  <RadioGroupItem
                    id={`${uid}-${value}`}
                    value={value}
                    className="mt-1"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <Icon
                        className="size-4 text-saffron-deep dark:text-saffron"
                        aria-hidden="true"
                      />
                      {copy[value]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {copy[`${value}Hint`]}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
            <FieldError>{error}</FieldError>
          </Field>
        )}
      />
    </FieldSet>
  );
}
