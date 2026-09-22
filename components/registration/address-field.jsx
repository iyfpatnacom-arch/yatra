"use client";

import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_ADDRESS_LENGTH } from "@/lib/config";
import { filterAddress } from "@/lib/input-filters";
import { translateError } from "@/lib/i18n";

/**
 * The billing address, asked once per booking under the first traveller.
 *
 * Razorpay's checkout does not collect one, and the receipt prints it. One
 * line with a character count rather than a textarea: the receipt has room
 * for about two lines, and a visible limit is kinder than a rejected form.
 */
export function AddressField({ dict }) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const uid = useId();

  const f = dict.form.fields;
  const errorKey = errors.address?.message;
  const error = errorKey ? translateError(dict, errorKey) : null;

  return (
    <Controller
      control={control}
      name="address"
      render={({ field }) => {
        const value = field.value ?? "";

        return (
          <Field data-invalid={Boolean(error) || undefined} className="mt-5">
            <div className="flex items-baseline justify-between gap-2">
              <FieldLabel htmlFor={`${uid}-address`}>{f.address}</FieldLabel>
              <span className="text-xs text-muted-foreground tabular-nums">
                {value.length}/{MAX_ADDRESS_LENGTH}
              </span>
            </div>
            <Input
              id={`${uid}-address`}
              name={field.name}
              ref={field.ref}
              value={value}
              onChange={(event) =>
                field.onChange(
                  filterAddress(event.target.value, MAX_ADDRESS_LENGTH)
                )
              }
              onBlur={field.onBlur}
              className="h-11"
              autoComplete="street-address"
              maxLength={MAX_ADDRESS_LENGTH}
              placeholder={f.addressPlaceholder}
              aria-invalid={Boolean(error) || undefined}
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>{f.addressHint}</FieldDescription>
            )}
          </Field>
        );
      }}
    />
  );
}
