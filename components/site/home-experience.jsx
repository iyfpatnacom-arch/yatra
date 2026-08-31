"use client";

import { useState } from "react";
import { ShowcasePanel } from "@/components/site/showcase-panel";
import { RegistrationPanel } from "@/components/site/registration-panel";

/**
 * The whole landing page.
 *
 * Desktop is a fixed two-column split: photographs on the left with a poster
 * floated over them where the two columns meet, and the form in a pinned
 * column on the right that scrolls inside itself. A phone cannot hold both at
 * once, so the same two panels become two views and this component owns which
 * one is showing.
 */
export function HomeExperience({ lang, dict, slides, posters, trip }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="lg:flex lg:h-dvh lg:overflow-hidden">
      <ShowcasePanel
        lang={lang}
        dict={dict}
        slides={slides}
        posters={posters}
        trip={trip}
        onRegister={() => setShowForm(true)}
        className={showForm ? "hidden lg:block" : "block"}
      />

      <RegistrationPanel
        lang={lang}
        dict={dict}
        trip={trip}
        onBack={() => setShowForm(false)}
        className={showForm ? "flex" : "hidden lg:flex"}
      />
    </div>
  );
}
