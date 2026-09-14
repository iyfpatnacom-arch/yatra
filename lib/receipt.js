import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * The registration receipt, drawn to match the approved BRAJ YATRA 2026
 * artwork: centred ISKCON Patna mark, the two headings, eleven label/value
 * rows, and the closing line. The wording and the order of the rows are fixed
 * — they are proofread artwork, not a template to improvise on.
 *
 * pdf-lib with the standard PDF fonts, and deliberately nothing heavier: the
 * fourteen standard fonts are built into every reader, so none of their bytes
 * travel in the file and a receipt is under 2 KB before the logo is added to
 * it. Laying this out in HTML and printing it through headless Chromium would
 * buy nothing and cost a ~300 MB dependency a serverless function cannot
 * cold-start inside the customer's redirect.
 *
 * The price of that choice is one hard constraint: the standard fonts encode
 * WinAnsi only. There is no rupee sign and no Devanagari, so every string goes
 * through `latin()` first and money is written "2000 Rs." exactly as the
 * artwork does.
 */

const A4 = [595.28, 841.89];
const INK = rgb(0.13, 0.13, 0.13);

/**
 * Where the artwork puts things.
 *
 * Measured off the approved receipt at its own scale (920px across a 595.28pt
 * page, so 1.545px per point) and written here as absolute positions rather
 * than as offsets that accumulate. Absolute means a missing logo leaves the
 * gap it would have filled instead of dragging all eleven rows up the page.
 *
 * The type sizes are the ones at which Helvetica draws each line to the same
 * width as the artwork does. Helvetica is not the geometric face the artwork
 * was set in — no standard PDF font is — so matching width is what keeps the
 * block looking the same weight and proportion on the page.
 */
/* The top of the logo's viewBox. The artwork leaves some air above the mark
   inside its own box, so the visible top lands where the page margin is. */
const LOGO_TOP_Y = 806;
const LOGO_HEIGHT = 72;
/* "PATNA", set under the ISKCON wordmark in a serif to sit with it and spaced
   out to about the width of the rule above it. */
const PLACE_Y = 724;
const PLACE_SIZE = 12;
const PLACE_TRACKING = 3;
/* Everything below the mark sits about 20pt lower than the artwork, to make
   room for the larger logo and PATNA; the rows still clear the footer. */
const TITLE_Y = 686;
const TITLE_SIZE = 35;
const SUBTITLE_Y = 645;
const SUBTITLE_SIZE = 20;
const ROW_TOP_Y = 583;
const ROW_GAP = 41.7;
const BODY_SIZE = 22;
const LABEL_X = 43;
const VALUE_X = 302;
const VALUE_WIDTH = A4[0] - 48 - VALUE_X;
/* The artwork sets this 36pt off the foot, which is exactly the margin many
   office printers cannot reach. Four more millimetres costs nothing visible
   and keeps the line on the paper. */
const FOOTER_Y = 48;
const FOOTER_SIZE = 21;
/* Floor for the last row's baseline, leaving the closing line clear. */
const ROWS_BOTTOM_Y = 100;
/* How small a value may be set before it is cut instead of shrunk. */
const MIN_BODY_SIZE = 13;

/**
 * The mark at the head of the receipt: public/iskcon-logo.svg.
 *
 * Drawn as vector paths rather than embedded as an image, so it stays sharp at
 * any zoom and costs only its path data. Every path is filled black whatever
 * colour the file uses: the receipt is black type, and a coloured mark prints
 * as a muddy grey on an office printer.
 *
 * Optional by design: a missing or unreadable logo must not cost a traveller
 * their receipt at the moment they have just paid. Because the headings are
 * positioned absolutely, its absence leaves a gap rather than shifting the
 * page around it.
 */
const LOGO_FILE = "iskcon-logo.svg";
const BLACK = rgb(0, 0, 0);

let logoCache;

/**
 * Just enough SVG to draw an Illustrator export: the viewBox, and every
 * <path> offset by the translate() of each <g> it sits inside. pdf-lib reads
 * path data itself; what it cannot do is read a file or follow groups. Any
 * transform other than translate is not followed — this logo has none, and a
 * re-export that adds one would show up as a displaced piece of the mark.
 */
function parseLogo(svg) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1].trim().split(/[\s,]+/).map(Number);
  if (viewBox?.length !== 4 || viewBox.some(Number.isNaN)) return null;
  const [minX, minY, width, height] = viewBox;

  const paths = [];
  const offsets = [[-minX, -minY]];

  for (const [markup] of svg.matchAll(/<g\b[^>]*>|<\/g>|<path\b[^>]*>/g)) {
    const [dx, dy] = offsets[offsets.length - 1];

    if (markup === "</g>") {
      if (offsets.length > 1) offsets.pop();
    } else if (markup.startsWith("<g")) {
      const move = /transform="translate\(\s*([-\d.e]+)[\s,]*([-\d.e]*)\s*\)"/.exec(markup);
      if (!markup.endsWith("/>")) {
        offsets.push([dx + Number(move?.[1] || 0), dy + Number(move?.[2] || 0)]);
      }
    } else {
      const d = /\sd="([^"]+)"/.exec(markup)?.[1];
      if (d) paths.push({ d: d.replace(/\s+/g, " "), dx, dy });
    }
  }

  return paths.length ? { width, height, paths } : null;
}

async function loadLogo() {
  // Only a found logo is remembered. Absence is re-checked on every receipt,
  // so a logo dropped in after the server started is picked up without a
  // restart — the cost is one failed file read per receipt until then.
  if (logoCache) return logoCache;

  try {
    const svg = await readFile(path.join(process.cwd(), "public", LOGO_FILE), "utf8");
    logoCache = parseLogo(svg);
    if (!logoCache) console.error(`[receipt] public/${LOGO_FILE} has nothing to draw`);
  } catch {
    // Absence is not an error.
  }

  return logoCache || null;
}

/**
 * Folds a string down to what a standard PDF font can actually draw.
 *
 * A name is free text and the form accepts any script, so a Devanagari name
 * would otherwise throw inside `drawText` and turn a paid registration into a
 * 500. Accents are decomposed and dropped first, so an accented Latin name
 * degrades legibly rather than into question marks.
 */
function latin(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‒-―]/g, "-")
    .replace(/₹/g, "Rs. ")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits a word too long to fit on any line, so nothing can run off the page. */
function breakWord(word, font, size, maxWidth) {
  const pieces = [];
  let piece = "";

  for (const character of word) {
    if (piece && font.widthOfTextAtSize(piece + character, size) > maxWidth) {
      pieces.push(piece);
      piece = character;
    } else {
      piece += character;
    }
  }
  if (piece) pieces.push(piece);

  return pieces;
}

/** Greedy wrap, so a long address breaks across lines the way the artwork does. */
function wrap(value, font, size, maxWidth) {
  const words = latin(value).split(" ").filter(Boolean);
  if (!words.length) return ["-"];

  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }

    // Close the line in progress, if the word is simply being pushed off it.
    if (line) lines.push(line);
    line = "";

    /* A word wider than the whole column has no space to break at — a long
       email address is the one that turns up here. It is cut by character,
       and the check must happen even on an empty line: that is exactly the
       case where there is nothing to push the word onto. */
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      const pieces = breakWord(word, font, size, maxWidth);
      lines.push(...pieces.slice(0, -1));
      line = pieces[pieces.length - 1];
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);

  return lines;
}

/**
 * The lines for one value, and the size to draw them at.
 *
 * An email address is a single unbreakable token and is routinely wider than
 * the value column. Cutting one in half reads as corruption, so a value with
 * nothing to wrap at is stepped down in size until it fits on one line
 * instead — and only if it is still too wide at the floor does `wrap` cut it.
 * Everything short enough is drawn at the artwork's own size, which is why an
 * ordinary receipt looks exactly like the artwork.
 */
function fitValue(value, font, maxWidth) {
  const text = latin(value) || "-";
  const unbreakable = !text.includes(" ");

  if (unbreakable) {
    for (let size = BODY_SIZE; size >= MIN_BODY_SIZE; size -= 0.5) {
      if (font.widthOfTextAtSize(text, size) <= maxWidth) {
        return { lines: [text], size };
      }
    }
    return { lines: wrap(text, font, MIN_BODY_SIZE, maxWidth), size: MIN_BODY_SIZE };
  }

  return { lines: wrap(text, font, BODY_SIZE, maxWidth), size: BODY_SIZE };
}

/** 09/09/2026 — the artwork's format, in the timezone the yatra runs in. */
const DMY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

function when(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : DMY.format(date);
}

/**
 * CCAvenue names the rail, the artwork names it the way a devotee would.
 * Anything unmapped is passed through, so a new rail reads sensibly on day one
 * rather than reading "Online undefined".
 */
const MODES = {
  "unified payments": "UPI",
  upi: "UPI",
  "credit card": "Credit Card",
  "debit card": "Debit Card",
  "net banking": "Net Banking",
  netbanking: "Net Banking",
  wallet: "Wallet",
};

function paymentMode(mode) {
  const raw = String(mode || "").trim();
  if (!raw) return "Online";
  return `Online ${MODES[raw.toLowerCase()] || raw}`;
}

/**
 * The billing address, which the registration form does not collect.
 *
 * CCAvenue's own billing page asks for it and echoes it back in the response
 * we store as `payment.raw`, so on a paid registration it is usually already
 * here. Whether those fields arrive depends on the CCAvenue account's billing
 * configuration, which is why every part is optional and the row falls back to
 * a dash rather than printing "undefined" on a receipt.
 */
export function billingAddress(registration) {
  const raw = registration?.payment?.raw || {};
  const parts = [
    raw.billing_address,
    raw.billing_city,
    raw.billing_state,
    raw.billing_zip ? `Pin-${String(raw.billing_zip).trim()}` : null,
  ]
    .map((part) => String(part || "").trim())
    .filter((part) => part && part.toLowerCase() !== "null");

  return parts.length ? parts.join(", ") : "-";
}

/** The filename WhatsApp and the browser both show: Receipt-BRAJ-Y-101.pdf */
export function receiptFilename(registration) {
  const id = latin(registration?.orderId || "yatra").replace(/[^A-Za-z0-9-]/g, "");
  return `Receipt-${id}.pdf`;
}

/** The eleven rows, in the artwork's order and with its exact wording. */
function rowsFor(registration) {
  const primary = registration.primary || {};
  const payment = registration.payment || {};

  return [
    ["Registration Number -", registration.orderId],
    ["Registration Date -", when(registration.createdAt)],
    ["Total Member -", String(registration.travellerCount || 1).padStart(2, "0")],
    ["Billing Name -", primary.name],
    ["Billing Address -", billingAddress(registration)],
    ["Mobile Number -", primary.phone],
    ["Email -", primary.email],
    ["Total Amount -", `${Math.round(Number(registration.amount) || 0)} Rs.`],
    ["Payment status -", "Paid"],
    ["Transcation Date -", when(payment.paidAt)],
    ["Transcation Mode -", paymentMode(payment.paymentMode)],
  ];
}

/**
 * Draws the receipt for one registration and returns the PDF bytes.
 *
 * Everything printed is read off the stored document, so the receipt is a pure
 * function of the registration — which is what lets it be regenerated on every
 * request instead of being stored anywhere.
 */
export async function buildReceiptPdf(registration) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage(A4);
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  const centre = (value, y, size) => {
    const safe = latin(value);
    page.drawText(safe, {
      x: (A4[0] - font.widthOfTextAtSize(safe, size)) / 2,
      y,
      size,
      font,
      color: INK,
    });
  };

  /* ---- Mark and headings ---------------------------------------------- */

  const logo = await loadLogo();
  if (logo) {
    try {
      // Sized by height, so a wider or narrower mark keeps the headings put.
      const scale = LOGO_HEIGHT / logo.height;
      const left = (A4[0] - logo.width * scale) / 2;
      for (const { d, dx, dy } of logo.paths) {
        page.drawSvgPath(d, {
          x: left + dx * scale,
          y: LOGO_TOP_Y - dy * scale,
          scale,
          color: BLACK,
        });
      }

      /* Letter by letter, since pdf-lib has no letter-spacing. Measured the
         same way so the spaced-out word is still truly centred. */
      const serif = await pdf.embedFont(StandardFonts.TimesRoman);
      const letters = [..."PATNA"];
      const widths = letters.map((letter) => serif.widthOfTextAtSize(letter, PLACE_SIZE));
      let x =
        (A4[0] -
          widths.reduce((sum, w) => sum + w, 0) -
          PLACE_TRACKING * (letters.length - 1)) /
        2;
      letters.forEach((letter, i) => {
        page.drawText(letter, { x, y: PLACE_Y, size: PLACE_SIZE, font: serif, color: BLACK });
        x += widths[i] + PLACE_TRACKING;
      });
    } catch (error) {
      // A receipt without its mark still beats a 500 for someone who has paid.
      console.error("[receipt] logo could not be embedded", error);
    }
  }

  centre("BRAJ YATRA 2026", TITLE_Y, TITLE_SIZE);
  centre("REGISTRATION RECEIPT", SUBTITLE_Y, SUBTITLE_SIZE);

  /* ---- The rows -------------------------------------------------------- */

  const rows = rowsFor(registration).map(([label, value]) => ({
    label,
    ...fitValue(value, font, VALUE_WIDTH),
  }));

  /* Eleven rows and the one address wrap the artwork allows for sit at exactly
     the artwork's spacing. A booking that wraps more lines than that — a very
     long name and a very long address together — closes the gaps just enough
     to stay off the closing line, rather than running over it. */
  const lineCount = rows.reduce((total, row) => total + row.lines.length, 0);
  const gap = Math.min(
    ROW_GAP,
    (ROW_TOP_Y - ROWS_BOTTOM_Y) / Math.max(lineCount - 1, 1)
  );

  let y = ROW_TOP_Y;

  for (const row of rows) {
    page.drawText(latin(row.label), {
      x: LABEL_X,
      y,
      size: BODY_SIZE,
      font,
      color: INK,
    });

    for (const line of row.lines) {
      page.drawText(line, { x: VALUE_X, y, size: row.size, font, color: INK });
      y -= gap;
    }
  }

  /* ---- Foot ------------------------------------------------------------ */

  centre("THANK YOU ! HARE KRISHNA", FOOTER_Y, FOOTER_SIZE);

  pdf.setTitle(`Registration receipt ${registration.orderId}`);
  pdf.setAuthor("ISKCON Patna");
  pdf.setSubject("BRAJ YATRA 2026");
  pdf.setCreator("ISKCON Patna");

  return pdf.save();
}
