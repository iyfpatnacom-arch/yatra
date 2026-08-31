import { HomeExperience } from "@/components/site/home-experience";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { HERO_SLIDES, TRIP, YATRA_POSTERS } from "@/lib/config";

function localeOf(lang) {
  return lang === "hi" ? "hi-IN" : "en-IN";
}

function formatDay(lang, iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateRange(lang, startISO, endISO) {
  const locale = localeOf(lang);
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    timeZone: "UTC",
  });
  const full = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const sameMonth =
    start.getUTCMonth() === end.getUTCMonth() &&
    start.getUTCFullYear() === end.getUTCFullYear();

  return sameMonth
    ? `${day.format(start)}–${full.format(end)}`
    : `${full.format(start)} – ${full.format(end)}`;
}

export default async function HomePage({ params }) {
  const { lang: rawLang } = await params;
  const lang = normalizeLocale(rawLang);
  const dict = getDictionary(lang);

  const slides = HERO_SLIDES.map((slide) => ({
    src: slide.src,
    caption: dict.hero.slides[slide.captionKey] || "",
  }));

  /* Kept apart from the photographs because the two are shown in different
     places: a phone's carousel is the posters alone, while a desktop holds
     the first of them above the carousel of photographs. */
  const posters = YATRA_POSTERS.map((poster) => ({
    src: poster.src,
    caption: dict.hero.slides[poster.captionKey] || "",
    poster: true,
  }));

  /* Dates and the year are formatted here rather than in the client panels:
     the whole page below is a client tree, and an Intl call that runs in two
     places can disagree across a timezone boundary. */
  const trip = {
    departureCity: TRIP.departureCity[lang] || TRIP.departureCity.en,
    destination: TRIP.destination[lang] || TRIP.destination.en,
    dates: formatDateRange(lang, TRIP.startDate, TRIP.endDate),
    departureDay: formatDay(lang, TRIP.startDate),
    // Indian local time; pinning the offset keeps the countdown honest for a
    // visitor whose device clock is set elsewhere.
    departureISO: `${TRIP.startDate}T${TRIP.departureTime}:00+05:30`,
    year: new Date().getFullYear(),
  };

  return (
    <HomeExperience
      lang={lang}
      dict={dict}
      slides={slides}
      posters={posters}
      trip={trip}
    />
  );
}
