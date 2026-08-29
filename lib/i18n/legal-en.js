/**
 * Legal pages, English.
 *
 * Structured as data rather than markup so the same renderer serves every
 * policy page in both languages, and so a change of wording never becomes a
 * change of layout. `{placeholders}` are filled at render time from
 * lib/config (organisation name, domain, contact details, fee amounts) — the
 * entity named here must match the merchant registered with the payment
 * gateway, so it is never hardcoded in the prose.
 */

const legal = {
  eyebrow: "Legal",
  updated: "Last updated",
  backHome: "Back to home",
  more: "Other policies",

  privacy: {
    title: "Privacy Policy",
    summary:
      "How {org} collects, uses and safeguards the information you give us when you register for the Vrindavan Yatra.",
    sections: [
      {
        body: [
          "{org} organises the Vrindavan Yatra through its youth wing, the ISKCON Youth Forum (IYF), Patna. This policy explains what we collect at {domain}, why we collect it, and what we do with it. By registering for the yatra you agree to the practices described here.",
        ],
      },
      {
        heading: "1. Information We Collect",
        body: ["We collect only what a yatra registration actually requires:"],
        bullets: [
          {
            term: "Traveller details",
            text: "Full name, date of birth, gender, email address, contact number and WhatsApp number for every traveller in the booking.",
          },
          {
            term: "Devotional details",
            text: "The name of your facilitator or counsellor, and the number of rounds you chant daily. These help the coordinators group travellers and plan the sadhana schedule.",
          },
          {
            term: "Proof of identity",
            text: "A photograph of one government-issued ID (Aadhaar, PAN, Voter ID, Driving Licence or Passport). Rail travel and group accommodation both require us to hold identity records for every traveller.",
          },
          {
            term: "Payment information",
            text: "Payments are processed entirely on the secure servers of our payment gateway. We never see or store your card number, CVV, UPI PIN or net-banking credentials. We retain only the order reference, the amount, the payment status and the gateway tracking reference.",
          },
          {
            term: "Technical information",
            text: "Your browser user-agent string and chosen language, recorded with the registration to help us diagnose failed submissions.",
          },
        ],
      },
      {
        heading: "2. How We Use Your Information",
        bullets: [
          "To create and confirm your yatra registration and allot your seat.",
          "To make rail, road and accommodation arrangements for the group.",
          "To verify your identity at the time of departure, and to satisfy railway, accommodation and local authority requirements.",
          "To contact you by phone, email or WhatsApp about your booking, the departure schedule, and any change to the itinerary.",
          "To collect the balance of the yatra fee before departure.",
          "To answer your questions and handle refund or cancellation requests.",
        ],
      },
      {
        heading: "3. Sharing Your Information",
        body: [
          "We do not sell, rent or trade your personal information. We share it only where the yatra cannot run otherwise:",
        ],
        bullets: [
          {
            term: "Payment gateway",
            text: "Your name, email address and contact number are passed to our payment gateway so it can process the transaction and email you a receipt.",
          },
          {
            term: "Travel and accommodation providers",
            text: "Traveller names, ages, genders and ID details are shared with railway booking agents, transport operators and the places we stay, strictly for the purpose of making the booking.",
          },
          {
            term: "Messaging provider",
            text: "Your WhatsApp number is passed to our messaging provider to deliver booking confirmations and travel updates.",
          },
          {
            term: "Legal requirement",
            text: "We disclose information where we are required to by law, by a court, or by a government authority.",
          },
        ],
      },
      {
        heading: "4. Data Security",
        body: [
          "Registration data is held in an access-controlled database. ID photographs are stored separately and are never served on a public link — they can be opened only by an authenticated yatra coordinator, through an administrative page that is itself password protected. All traffic to {domain} is encrypted in transit over HTTPS.",
          "No system is perfectly secure, and we do not claim otherwise. We do, however, keep the amount of data we hold to the minimum the yatra needs.",
        ],
      },
      {
        heading: "5. Data Retention",
        body: [
          "We keep registration records for the duration of the yatra and for as long afterwards as accounting, tax and audit obligations require. ID photographs are deleted once the yatra has concluded and the records have been reconciled, unless we are required to retain them for longer.",
        ],
      },
      {
        heading: "6. Cookies",
        body: [
          "We use only functional cookies. One remembers whether you chose Hindi or English; another holds the signed session of a logged-in coordinator. We do not use advertising or cross-site tracking cookies. Blocking cookies will reset your language to Hindi on each visit but will not otherwise affect registration.",
        ],
      },
      {
        heading: "7. Minors",
        body: [
          "Travellers under 18 may register only through a parent or guardian, who must submit the registration and remain responsible for the child throughout the yatra. We do not knowingly collect information directly from a child.",
        ],
      },
      {
        heading: "8. Your Rights",
        body: [
          "You may ask us to show you the information we hold about you, to correct anything inaccurate, or to delete your record where we are not required to keep it. Write to {email} or call a coordinator on the numbers below, and we will respond within 7 working days.",
        ],
      },
      {
        heading: "9. Changes to This Policy",
        body: [
          "We may update this policy from time to time. The revised version is posted on this page with a new date at the top, and applies from the moment it is posted.",
        ],
      },
      {
        heading: "10. Grievances",
        body: [
          "In accordance with the Information Technology Act, 2000 and the rules made under it, any concern about this policy or about how your information has been handled may be raised with us at:",
        ],
        contact: true,
      },
    ],
  },

  terms: {
    title: "Terms & Conditions",
    summary:
      "The terms that govern registration for the Vrindavan Yatra organised by {org}.",
    sections: [
      {
        body: [
          "This document is an electronic record under the Information Technology Act, 2000 and the rules made under it, and is published in accordance with Rule 3(1) of the Information Technology (Intermediaries Guidelines) Rules, 2011, which requires the publication of the rules, privacy policy and terms of use governing {domain}.",
          "{domain} is operated by {org} through its youth wing, the ISKCON Youth Forum (IYF), Patna, for the sole purpose of taking registrations for the Vrindavan Yatra. By registering you accept these terms in full. If you disagree with any part of them, please do not register.",
        ],
      },
      {
        heading: "1. Eligibility & Registration",
        bullets: [
          "You must be 18 years or older to submit a registration. A traveller under 18 must be registered by a parent or guardian who travels with them or formally entrusts them to the coordinators.",
          "Every traveller in a booking must be entered individually, with their own contact number and identity document. A registration made in one person's name for travellers who are not listed is not valid.",
          "All information you supply must be true, accurate and complete. A registration containing false details may be cancelled without refund.",
          "The Youth category is for a single devotee travelling on their own. The Family / Couple category is for two or more travellers, up to {maxMembers} in one booking.",
        ],
      },
      {
        heading: "2. Yatra Fee, Booking Amount & Confirmation",
        bullets: [
          "The yatra fee per traveller is shown on the registration form before you pay, and depends on the category and, for families, on the train coach selected.",
          "A booking amount of {advance} per traveller is collected online at the time of registration. This reserves the seat; it is not the full fee.",
          "The balance is payable to the yatra coordinator before departure. A traveller whose balance is unpaid at departure may be refused boarding, and the booking amount is then treated as a cancellation within 7 days of departure.",
          "A registration is confirmed only when the booking amount has actually been received. Until then the seat is not held.",
          "Seats are limited. Registration may close early once the group is full, and we may decline any registration without assigning a reason.",
        ],
      },
      {
        heading: "3. Travel Arrangements",
        bullets: [
          "The coach class shown at registration is the class we will apply for. Rail reservations are subject to availability and to Indian Railways allotment; where the requested class cannot be confirmed we will offer you the alternative available, or a full refund of the booking amount.",
          "The itinerary, departure time, route, accommodation and darshan schedule are indicative. {org} may alter any of them where travel conditions, temple timings, weather or the safety of the group require it.",
          "Travellers are responsible for reaching the announced departure point at the announced time. The group will not be held back for a late traveller, and no refund is due in that case.",
        ],
      },
      {
        heading: "4. Identity Documents",
        bullets: [
          "Every traveller must upload a clear photograph of a valid government-issued identity document at the time of registration.",
          "Every traveller must also carry the original of that document throughout the yatra, and produce it on demand by railway staff, the police, accommodation providers or the yatra coordinators.",
          "A traveller who cannot produce a valid original may be refused travel, with no refund.",
        ],
      },
      {
        heading: "5. Code of Conduct",
        body: [
          "This is a devotional yatra to a place of pilgrimage. Every traveller agrees to observe the discipline of {org} for its full duration:",
        ],
        bullets: [
          "Only pure vegetarian food, with no onion and no garlic, is permitted at any point in the yatra.",
          "Smoking, alcohol, tobacco, paan, gutkha, drugs and every other intoxicant are strictly prohibited.",
          "Instructions of the yatra coordinators regarding timings, movement, seating, accommodation and safety must be followed at all times.",
          "Modest dress appropriate to a temple and a place of pilgrimage is expected throughout.",
          "Travellers must not leave the group without informing a coordinator.",
          "Conduct that disturbs other travellers, the temples visited, or the discipline of the group is not acceptable.",
          "A traveller who breaches this code may be removed from the yatra at their own cost and with no refund, and is responsible for their own return journey.",
        ],
      },
      {
        heading: "6. Health, Belongings & Liability",
        bullets: [
          "Travellers must be in a state of health that permits group travel, walking and long temple visits, and must carry their own regular medication. Please tell a coordinator about any medical condition before you register.",
          "Travellers are responsible for their own money, phones, jewellery, luggage and other belongings. {org} is not responsible for loss, theft or damage to personal property.",
          "The yatra is undertaken at the traveller's own risk. {org} is not liable for accident, injury, illness, delay, cancellation, or any loss caused by railways, transport operators, accommodation providers, or by events beyond our reasonable control.",
        ],
      },
      {
        heading: "7. Payments",
        bullets: [
          "All amounts are in Indian Rupees (INR).",
          "Payments are processed by a third-party payment gateway on its own secure pages. We do not receive or store your card, UPI or net-banking credentials.",
          "You are responsible for using a payment instrument you are authorised to use. Any chargeback raised in bad faith may be contested with the evidence of the registration.",
          "Where a payment is debited but the registration does not show as paid, contact us with the transaction reference. Amounts debited without a confirmed order are reversed by the gateway or the bank, ordinarily within 5-7 working days.",
        ],
      },
      {
        heading: "8. Acceptable Use of This Website",
        body: ["You must not:"],
        bullets: [
          "use {domain} in any way that damages it, or impairs its availability or performance;",
          "use it for any unlawful, fraudulent or harmful purpose, or to submit registrations you are not authorised to make;",
          "upload any material containing a virus, worm, trojan, keystroke logger or other malicious software;",
          "carry out any systematic or automated data collection — scraping, data mining, harvesting — on this website without our written consent;",
          "access it by robot or spider other than for the purpose of search engine indexing;",
          "use any data obtained from it for direct marketing of any kind.",
        ],
      },
      {
        heading: "9. Intellectual Property",
        body: [
          "All content on this website — text, photographs, graphics, marks and software — is owned by or licensed to {org} and is protected by applicable intellectual property law. It may not be reproduced, distributed or used elsewhere without our prior written consent.",
        ],
      },
      {
        heading: "10. Disclaimer & Limitation of Liability",
        body: [
          "This website is provided on an as-is and as-available basis, without warranty of any kind. We do not guarantee that it will always be available, secure or free from error.",
          "To the extent permitted by law, the total liability of {org} in connection with a registration is limited to the amount actually received from that traveller. We are not liable for indirect, incidental or consequential loss of any kind.",
        ],
      },
      {
        heading: "11. Indemnity",
        body: [
          "You agree to indemnify and hold harmless {org}, its trustees, officers, volunteers and coordinators against any claim, liability, loss or expense, including reasonable legal costs, arising from your breach of these terms or from your conduct during the yatra.",
        ],
      },
      {
        heading: "12. Changes to These Terms",
        body: [
          "We may amend these terms at any time. The current version is always the one on this page, and it applies from the moment it is posted. Please review it before each registration.",
        ],
      },
      {
        heading: "13. Governing Law & Jurisdiction",
        body: [
          "These terms are governed by the laws of India. Any dispute arising from them, from your use of this website, or from the yatra, is subject to the exclusive jurisdiction of the courts at Patna, Bihar.",
        ],
      },
      {
        heading: "14. Contact Us",
        contact: true,
      },
    ],
  },

  refund: {
    title: "Refund & Cancellation Policy",
    summary:
      "How cancellations, date changes and refunds work for Vrindavan Yatra registrations.",
    sections: [
      {
        body: [
          "Rail reservations, transport and accommodation for the yatra are booked as a group, well ahead of departure, and are paid for whether or not a traveller boards. A cancellation therefore costs the yatra real money, and the closer it is to departure the less of it can be recovered. The slabs below reflect that.",
        ],
      },
      {
        heading: "1. How to Cancel",
        body: [
          "Write to {email} from the email address used at registration, or call a coordinator on the numbers below. Quote your registration ID. A cancellation takes effect on the date we receive your request, not the date you decided.",
        ],
      },
      {
        heading: "2. Cancellation Slabs",
        body: [
          "Refunds are calculated on the amount actually paid to us, and are quoted to you before your cancellation is processed:",
        ],
        bullets: [
          {
            term: "30 days or more before departure",
            text: "75% of the amount paid is refunded.",
          },
          {
            term: "15 to 29 days before departure",
            text: "50% of the amount paid is refunded.",
          },
          {
            term: "7 to 14 days before departure",
            text: "25% of the amount paid is refunded.",
          },
          {
            term: "Less than 7 days before departure, or no-show",
            text: "No refund. The seat, ticket and accommodation cannot be reallocated at that notice.",
          },
        ],
      },
      {
        heading: "3. Date Change & Transfer",
        bullets: [
          "One transfer to a later yatra is permitted where it is requested at least 15 days before departure, and is subject to availability on that yatra. Any difference in fee is payable.",
          "A confirmed seat may be transferred to another traveller at least 15 days before departure, subject to the replacement traveller completing a full registration and submitting their identity document.",
          "A partial cancellation within a family booking — some travellers withdrawing, others travelling — is treated under the slabs above for the withdrawing travellers only.",
        ],
      },
      {
        heading: "4. Cancellation by Us",
        body: [
          "If {org} cancels the yatra, or cannot provide the travel arrangements registered for and you do not accept the alternative offered, the full amount you have paid is refunded. This is the only circumstance in which a full refund is made.",
        ],
      },
      {
        heading: "5. Non-Refundable",
        bullets: [
          "The yatra once completed, or a traveller's participation once it has begun, including a traveller who leaves the yatra part way through.",
          "A traveller removed from the yatra for breach of the code of conduct in our Terms & Conditions.",
          "A traveller refused travel for want of a valid original identity document, or who misses the departure.",
          "Voluntary donations made to the temple, which are not connected to a booking and are not refundable once processed.",
          "Payment gateway and bank charges on the original transaction, which are deducted from any refund.",
        ],
      },
      {
        heading: "6. How Refunds Are Paid",
        bullets: [
          "Approved refunds are made only to the original payment instrument — the same card, UPI handle or bank account the payment came from. We do not refund to a different account, and we do not refund in cash.",
          "Refunds are initiated within 7 working days of approval. The amount ordinarily reaches your account within a further 7-10 working days, depending on your bank or card issuer.",
          "You will be told the amount, the deduction applied and the reference number when the refund is initiated.",
        ],
      },
      {
        heading: "7. Failed & Duplicate Payments",
        body: [
          "Where an amount is debited but no registration is confirmed, or where the same registration is paid for twice, write to us with the transaction reference. Such amounts are returned in full, without any deduction. A failed transaction is usually reversed by the bank on its own within 5-7 working days.",
        ],
      },
      {
        heading: "8. Force Majeure",
        body: [
          "Where the yatra cannot proceed because of a natural disaster, an epidemic, a government restriction, a curfew, a railway strike, a withdrawal of permission or any other event beyond our reasonable control, we will refund whatever we are able to recover from the railways, transport operators and accommodation providers, or offer the amount as a credit against a future yatra. We are not liable for the portion that cannot be recovered.",
        ],
      },
      {
        heading: "9. Governing Law",
        body: [
          "This policy is governed by the laws of India, including the Consumer Protection Act, 2019. Any dispute under it is subject to the exclusive jurisdiction of the courts at Patna, Bihar.",
        ],
      },
      {
        heading: "10. Contact Us",
        contact: true,
      },
    ],
  },

  shipping: {
    title: "Service Delivery Policy",
    summary:
      "What you receive after paying, when you receive it, and how the yatra itself is delivered.",
    sections: [
      {
        body: [
          "The Vrindavan Yatra is a service. Nothing is shipped, couriered or physically delivered, and no shipping or delivery charge is ever collected.",
        ],
      },
      {
        heading: "1. On Payment",
        bullets: [
          "Your registration is confirmed on screen the moment the payment succeeds, with a registration ID you should keep safe.",
          "The payment gateway emails a payment receipt to the address you registered with, immediately after the transaction.",
          "A confirmation is also sent to your registered WhatsApp number, where messaging is enabled.",
          "You can return to your registration status page at any time using the link and registration ID shown after payment.",
        ],
      },
      {
        heading: "2. Before Departure",
        bullets: [
          "The yatra coordinator contacts every confirmed traveller with the reporting point, reporting time, travel details and packing instructions.",
          "The balance of the yatra fee is collected by the coordinator before departure.",
        ],
      },
      {
        heading: "3. Delivery of the Service",
        bullets: [
          "The service is delivered on the announced yatra dates, from the announced departure point at {city}, and concludes on the return of the group.",
          "It comprises group travel, accommodation, prasadam and the darshan and kirtan programme described at registration.",
        ],
      },
      {
        heading: "4. If Something Goes Wrong",
        body: [
          "If your payment succeeded but you received no confirmation within 24 hours, contact us at {email} or on the numbers below with your transaction reference, and we will resolve it. Refunds, where applicable, are dealt with under our Refund & Cancellation Policy.",
        ],
      },
    ],
  },

  about: {
    title: "About Us",
    summary: "Who we are, and what the Vrindavan Yatra is.",
    sections: [
      {
        heading: "About {org}",
        body: [
          "{org} is a centre of the International Society for Krishna Consciousness (ISKCON), founded by His Divine Grace A.C. Bhaktivedanta Swami Prabhupada. The temple at {address} serves the city through daily worship, festivals, spiritual education, prasadam distribution and community service.",
        ],
      },
      {
        heading: "ISKCON Youth Forum, Patna",
        body: [
          "The ISKCON Youth Forum (IYF) is the youth wing of {org}. It runs regular study groups, kirtan evenings, festivals and pilgrimages for students and young professionals across Patna. This website, {domain}, is operated by IYF Patna and is used for one purpose only: taking registrations for the Vrindavan Yatra.",
        ],
      },
      {
        heading: "The Vrindavan Yatra",
        body: [
          "The yatra is a group pilgrimage from {city} to Vrindavan Dham and the holy places around it — Govardhan, Gokul, Nandgaon and Barsana. Travel, accommodation and prasadam are arranged for the whole group, and the days are given to darshan, kirtan and the association of devotees.",
          "Two categories are offered. Youth registration is for a single devotee travelling alone. Family / Couple registration is for two or more travellers together, with a choice of sleeper or air-conditioned rail coach.",
        ],
      },
      {
        heading: "How Registration Works",
        body: [
          "Register on this website, upload an identity document for every traveller, and pay the booking amount of {advance} per traveller online to reserve the seats. The balance is settled with the yatra coordinator before departure. Full details are in our Terms & Conditions and Refund & Cancellation Policy.",
        ],
      },
      {
        heading: "Contact",
        contact: true,
      },
    ],
  },

  contact: {
    title: "Contact Us",
    summary: "Reach the yatra coordinators — by phone, on WhatsApp, or by email.",
    addressHeading: "Registered address",
    emailHeading: "Email",
    phoneHeading: "Office",
    helplineHeading: "Yatra helplines",
    helplineNote:
      "Please call the number for your category — youth and family bookings are handled by different coordinators.",
    youthLabel: "Youth registrations",
    familyLabel: "Family & couple registrations",
    hoursHeading: "When to call",
    hours: "Every day, 9:00 AM to 8:00 PM (IST)",
    responseNote:
      "Emails are answered within 7 working days. For anything concerning a payment, please include your registration ID.",
  },
};

export default legal;
