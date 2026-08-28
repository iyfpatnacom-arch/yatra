"use client";

import { useId } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IdProofField } from "@/components/registration/id-proof-field";
import { GENDER_OPTIONS } from "@/lib/config";
import { translateError } from "@/lib/i18n";

/** Walks "travellers.0.name" through the RHF error tree. */
function errorAt(errors, path) {
  return path
    .split(".")
    .reduce((node, key) => (node ? node[key] : undefined), errors);
}

export function TravellerFields({ index, dict }) {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext();
  const uid = useId();

  const base = `travellers.${index}`;
  const phone = useWatch({ control, name: `${base}.phone` });
  const whatsapp = useWatch({ control, name: `${base}.whatsapp` });

  const err = (field) => {
    const key = errorAt(errors, `${base}.${field}`)?.message;
    return key ? translateError(dict, key) : null;
  };

  const f = dict.form.fields;
  const whatsappMatchesPhone = Boolean(phone) && phone === whatsapp;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field data-invalid={Boolean(err("name")) || undefined} className="sm:col-span-2">
        <FieldLabel htmlFor={`${uid}-name`}>{f.name}</FieldLabel>
        <Input
          id={`${uid}-name`}
          className="h-11"
          autoComplete="name"
          placeholder={f.namePlaceholder}
          aria-invalid={Boolean(err("name")) || undefined}
          {...register(`${base}.name`)}
        />
        <FieldError>{err("name")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("email")) || undefined}>
        <FieldLabel htmlFor={`${uid}-email`}>{f.email}</FieldLabel>
        <Input
          id={`${uid}-email`}
          type="email"
          inputMode="email"
          className="h-11"
          autoComplete="email"
          placeholder={f.emailPlaceholder}
          aria-invalid={Boolean(err("email")) || undefined}
          {...register(`${base}.email`)}
        />
        <FieldError>{err("email")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("phone")) || undefined}>
        <FieldLabel htmlFor={`${uid}-phone`}>{f.phone}</FieldLabel>
        <Input
          id={`${uid}-phone`}
          type="tel"
          inputMode="numeric"
          maxLength={14}
          className="h-11"
          autoComplete="tel"
          placeholder={f.phonePlaceholder}
          aria-invalid={Boolean(err("phone")) || undefined}
          {...register(`${base}.phone`)}
        />
        <FieldError>{err("phone")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("whatsapp")) || undefined}>
        <div className="flex items-center justify-between gap-2">
          <FieldLabel htmlFor={`${uid}-whatsapp`}>{f.whatsapp}</FieldLabel>
          <button
            type="button"
            disabled={!phone || whatsappMatchesPhone}
            onClick={() =>
              setValue(`${base}.whatsapp`, phone, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            className="shrink-0 text-xs font-medium text-saffron-deep underline-offset-2 hover:underline disabled:opacity-40 disabled:hover:no-underline dark:text-saffron"
          >
            {f.sameAsPhone}
          </button>
        </div>
        <Input
          id={`${uid}-whatsapp`}
          type="tel"
          inputMode="numeric"
          maxLength={14}
          className="h-11"
          placeholder={f.whatsappPlaceholder}
          aria-invalid={Boolean(err("whatsapp")) || undefined}
          {...register(`${base}.whatsapp`)}
        />
        <FieldError>{err("whatsapp")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("facilitator")) || undefined}>
        <FieldLabel htmlFor={`${uid}-facilitator`}>{f.facilitator}</FieldLabel>
        <Input
          id={`${uid}-facilitator`}
          className="h-11"
          placeholder={f.facilitatorPlaceholder}
          aria-invalid={Boolean(err("facilitator")) || undefined}
          {...register(`${base}.facilitator`)}
        />
        <FieldError>{err("facilitator")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("chantingRounds")) || undefined}>
        <FieldLabel htmlFor={`${uid}-rounds`}>{f.chantingRounds}</FieldLabel>
        <Input
          id={`${uid}-rounds`}
          type="number"
          inputMode="numeric"
          min={0}
          max={64}
          step={1}
          className="h-11"
          placeholder={f.chantingRoundsPlaceholder}
          aria-invalid={Boolean(err("chantingRounds")) || undefined}
          {...register(`${base}.chantingRounds`)}
        />
        {err("chantingRounds") ? (
          <FieldError>{err("chantingRounds")}</FieldError>
        ) : (
          <FieldDescription>{f.chantingRoundsHint}</FieldDescription>
        )}
      </Field>

      <Field data-invalid={Boolean(err("dob")) || undefined}>
        <FieldLabel htmlFor={`${uid}-dob`}>{f.dob}</FieldLabel>
        <Input
          id={`${uid}-dob`}
          type="date"
          className="h-11"
          max={new Date().toISOString().slice(0, 10)}
          autoComplete="bday"
          aria-invalid={Boolean(err("dob")) || undefined}
          {...register(`${base}.dob`)}
        />
        <FieldError>{err("dob")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("gender")) || undefined}>
        <FieldLabel htmlFor={`${uid}-gender`}>{f.gender}</FieldLabel>
        <Controller
          control={control}
          name={`${base}.gender`}
          render={({ field }) => (
            <Select
              name={field.name}
              value={field.value || null}
              onValueChange={(next) => field.onChange(next ?? "")}
            >
              <SelectTrigger
                id={`${uid}-gender`}
                className="h-11 w-full"
                onBlur={field.onBlur}
                aria-invalid={Boolean(err("gender")) || undefined}
              >
                <SelectValue placeholder={f.genderPlaceholder}>
                  {(value) =>
                    value ? dict.form.genders[value] : f.genderPlaceholder
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {dict.form.genders[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FieldError>{err("gender")}</FieldError>
      </Field>

      <Field
        data-invalid={Boolean(err("idProof")) || undefined}
        className="sm:col-span-2"
      >
        <FieldLabel htmlFor={`${uid}-idproof`}>{f.idProof}</FieldLabel>
        <Controller
          control={control}
          name={`${base}.idProof`}
          render={({ field }) => (
            <IdProofField
              inputId={`${uid}-idproof`}
              value={field.value || null}
              onChange={field.onChange}
              dict={dict}
              invalid={Boolean(err("idProof"))}
            />
          )}
        />
        <FieldError>{err("idProof")}</FieldError>
      </Field>
    </div>
  );
}
