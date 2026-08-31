"use client";

import { useEffect, useId } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Lock } from "lucide-react";
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
import {
  CHANTING_ROUND_OPTIONS,
  OTHER_FACILITATOR,
  facilitatorOptionsFor,
  genderOptionsFor,
} from "@/lib/config";
import { filterEmail, filterMobile, filterName } from "@/lib/input-filters";
import { translateError } from "@/lib/i18n";

/** Walks "travellers.0.name" through the RHF error tree. */
function errorAt(errors, path) {
  return path
    .split(".")
    .reduce((node, key) => (node ? node[key] : undefined), errors);
}

/**
 * A text input whose value is cleaned on the way in.
 *
 * Controller rather than `register` because the clean-up has to land before
 * the value reaches form state: the point is that a digit typed into a name
 * never appears at all, instead of being reported back as an error.
 */
function GuardedInput({ control, name, filter, ...props }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Input
          {...props}
          name={field.name}
          ref={field.ref}
          value={field.value ?? ""}
          onChange={(event) => field.onChange(filter(event.target.value))}
          onBlur={field.onBlur}
        />
      )}
    />
  );
}

/**
 * A dropdown bound to a form field.
 *
 * The value is normalised to `null` when nothing is picked: base-ui reads null
 * as "no selection" and shows the placeholder, whereas the empty string the
 * form starts with would be a real selection carrying no label.
 */
function PickerField({
  control,
  name,
  id,
  placeholder,
  options,
  labelFor,
  invalid,
}) {
  const empty = (value) => value === null || value === undefined || value === "";

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          name={field.name}
          value={empty(field.value) ? null : field.value}
          onValueChange={(next) => field.onChange(next ?? "")}
        >
          <SelectTrigger
            id={id}
            className="h-11 w-full"
            onBlur={field.onBlur}
            aria-invalid={invalid || undefined}
          >
            <SelectValue placeholder={placeholder}>
              {(value) => (empty(value) ? placeholder : labelFor(value))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {labelFor(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

/** Today and 110 years ago, as a `date` input wants them. */
function dobBounds() {
  const now = new Date();
  const oldest = new Date(
    Date.UTC(now.getUTCFullYear() - 110, now.getUTCMonth(), now.getUTCDate())
  );
  return {
    max: now.toISOString().slice(0, 10),
    min: oldest.toISOString().slice(0, 10),
  };
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
  const type = useWatch({ control, name: "type" });
  const genders = genderOptionsFor(type);
  const facilitators = facilitatorOptionsFor(type);
  const phone = useWatch({ control, name: `${base}.phone` });
  const whatsapp = useWatch({ control, name: `${base}.whatsapp` });
  const gender = useWatch({ control, name: `${base}.gender` });
  const facilitator = useWatch({ control, name: `${base}.facilitator` });

  const isOtherFacilitator = facilitator === OTHER_FACILITATOR;

  /* A question with one legal answer is not a question. Youth is male-only, so
     the field is shown filled and locked — and pinned here as well, which
     covers a row appended before the category was switched. */
  const lockedGender = genders.length === 1 ? genders[0] : null;

  useEffect(() => {
    if (lockedGender && gender !== lockedGender) {
      setValue(`${base}.gender`, lockedGender, { shouldValidate: true });
    }
  }, [base, gender, lockedGender, setValue]);

  const err = (field) => {
    const key = errorAt(errors, `${base}.${field}`)?.message;
    return key ? translateError(dict, key) : null;
  };

  const f = dict.form.fields;
  const whatsappMatchesPhone = Boolean(phone) && phone === whatsapp;
  const dob = dobBounds();

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field data-invalid={Boolean(err("name")) || undefined} className="sm:col-span-2">
        <FieldLabel htmlFor={`${uid}-name`}>{f.name}</FieldLabel>
        <GuardedInput
          control={control}
          name={`${base}.name`}
          filter={filterName}
          id={`${uid}-name`}
          className="h-11"
          autoComplete="name"
          maxLength={80}
          placeholder={f.namePlaceholder}
          aria-invalid={Boolean(err("name")) || undefined}
        />
        <FieldError>{err("name")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("email")) || undefined}>
        <FieldLabel htmlFor={`${uid}-email`}>{f.email}</FieldLabel>
        <GuardedInput
          control={control}
          name={`${base}.email`}
          filter={filterEmail}
          id={`${uid}-email`}
          type="email"
          inputMode="email"
          className="h-11"
          autoComplete="email"
          maxLength={254}
          spellCheck={false}
          autoCapitalize="none"
          placeholder={f.emailPlaceholder}
          aria-invalid={Boolean(err("email")) || undefined}
        />
        <FieldError>{err("email")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("phone")) || undefined}>
        <FieldLabel htmlFor={`${uid}-phone`}>{f.phone}</FieldLabel>
        <GuardedInput
          control={control}
          name={`${base}.phone`}
          filter={filterMobile}
          id={`${uid}-phone`}
          type="tel"
          inputMode="numeric"
          maxLength={12}
          className="h-11"
          autoComplete="tel"
          placeholder={f.phonePlaceholder}
          aria-invalid={Boolean(err("phone")) || undefined}
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
        <GuardedInput
          control={control}
          name={`${base}.whatsapp`}
          filter={filterMobile}
          id={`${uid}-whatsapp`}
          type="tel"
          inputMode="numeric"
          maxLength={12}
          className="h-11"
          placeholder={f.whatsappPlaceholder}
          aria-invalid={Boolean(err("whatsapp")) || undefined}
        />
        <FieldError>{err("whatsapp")}</FieldError>
      </Field>

      <Field
        data-invalid={Boolean(err("facilitator")) || undefined}
        className={isOtherFacilitator ? "sm:col-span-2" : undefined}
      >
        <FieldLabel htmlFor={`${uid}-facilitator`}>{f.facilitator}</FieldLabel>
        <PickerField
          control={control}
          name={`${base}.facilitator`}
          id={`${uid}-facilitator`}
          placeholder={f.facilitatorPlaceholder}
          invalid={Boolean(err("facilitator"))}
          options={facilitators}
          labelFor={(option) =>
            option === OTHER_FACILITATOR ? f.facilitatorOther : option
          }
        />
        <FieldError>{err("facilitator")}</FieldError>

        {/* A devotee counselled by someone off the list still has to be
            reachable, so picking "Other" asks for the two things the
            coordinator would otherwise have to chase. */}
        {isOtherFacilitator ? (
          <div className="mt-1 grid gap-4 rounded-xl border border-dashed border-saffron/35 bg-saffron/4 p-3.5 sm:grid-cols-2">
            <Field data-invalid={Boolean(err("facilitatorName")) || undefined}>
              <FieldLabel htmlFor={`${uid}-facilitator-name`}>
                {f.facilitatorOtherName}
              </FieldLabel>
              <GuardedInput
                control={control}
                name={`${base}.facilitatorName`}
                filter={filterName}
                id={`${uid}-facilitator-name`}
                className="h-11"
                maxLength={80}
                placeholder={f.facilitatorOtherNamePlaceholder}
                aria-invalid={Boolean(err("facilitatorName")) || undefined}
              />
              <FieldError>{err("facilitatorName")}</FieldError>
            </Field>

            <Field data-invalid={Boolean(err("facilitatorPhone")) || undefined}>
              <FieldLabel htmlFor={`${uid}-facilitator-phone`}>
                {f.facilitatorOtherPhone}
              </FieldLabel>
              <GuardedInput
                control={control}
                name={`${base}.facilitatorPhone`}
                filter={filterMobile}
                id={`${uid}-facilitator-phone`}
                type="tel"
                inputMode="numeric"
                maxLength={12}
                className="h-11"
                placeholder={f.facilitatorOtherPhonePlaceholder}
                aria-invalid={Boolean(err("facilitatorPhone")) || undefined}
              />
              <FieldError>{err("facilitatorPhone")}</FieldError>
            </Field>
          </div>
        ) : null}
      </Field>

      <Field data-invalid={Boolean(err("chantingRounds")) || undefined}>
        <FieldLabel htmlFor={`${uid}-rounds`}>{f.chantingRounds}</FieldLabel>
        <PickerField
          control={control}
          name={`${base}.chantingRounds`}
          id={`${uid}-rounds`}
          placeholder={f.chantingRoundsPlaceholder}
          invalid={Boolean(err("chantingRounds"))}
          options={CHANTING_ROUND_OPTIONS}
          labelFor={(option) => String(option)}
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
          min={dob.min}
          max={dob.max}
          autoComplete="bday"
          aria-invalid={Boolean(err("dob")) || undefined}
          {...register(`${base}.dob`)}
        />
        <FieldError>{err("dob")}</FieldError>
      </Field>

      <Field data-invalid={Boolean(err("gender")) || undefined}>
        <FieldLabel htmlFor={`${uid}-gender`}>{f.gender}</FieldLabel>
        {lockedGender ? (
          <>
            <div className="relative">
              <Input
                id={`${uid}-gender`}
                readOnly
                aria-readonly="true"
                value={dict.form.genders[lockedGender]}
                className="h-11 cursor-default bg-muted/60 pr-9 text-muted-foreground"
              />
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground"
              />
            </div>
            <FieldDescription>{f.genderYouthHint}</FieldDescription>
          </>
        ) : (
          <>
            <PickerField
              control={control}
              name={`${base}.gender`}
              id={`${uid}-gender`}
              placeholder={f.genderPlaceholder}
              invalid={Boolean(err("gender"))}
              options={genders}
              labelFor={(option) => dict.form.genders[option]}
            />
            <FieldError>{err("gender")}</FieldError>
          </>
        )}
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
