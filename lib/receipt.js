import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { HELPLINES, ORG, TRIP } from "./config";

/**
 * The registration acknowledgement receipt, drawn to match the approved
 * BRAJ YATRA 2026 artwork: a letterhead (mark and name on the left, receipt
 * title and number on the right), the yatra and its date, a shaded amount
 * panel with a PAID stamp, ten label/value rows, and the closing lines. The
 * wording and the order of the rows are fixed — they are proofread artwork,
 * not a template to improvise on.
 *
 * pdf-lib with the standard PDF fonts, and deliberately nothing heavier: the
 * fourteen standard fonts are built into every reader, so none of their bytes
 * travel in the file and a receipt is a few KB before the logo is added to
 * it. Laying this out in HTML and printing it through headless Chromium would
 * buy nothing and cost a ~300 MB dependency a serverless function cannot
 * cold-start inside the customer's redirect.
 *
 * The price of that choice is one hard constraint: the standard fonts encode
 * WinAnsi only. There is no rupee sign and no Devanagari, so every string goes
 * through `latin()` first and money is written "INR" / "Rs." exactly as the
 * artwork does.
 */

const A4 = [595.28, 841.89];
const INK = rgb(0.1, 0.1, 0.1);
const GREY = rgb(0.42, 0.42, 0.42);
const SAFFRON = rgb(0.72, 0.4, 0.1);
const GREEN = rgb(0.12, 0.48, 0.27);
const RULE = rgb(0.89, 0.89, 0.89);
const PANEL = rgb(0.98, 0.965, 0.925);
const PANEL_EDGE = rgb(0.89, 0.87, 0.82);

/**
 * Where the artwork puts things.
 *
 * Measured off the approved receipt at its own scale (920px across a 595.28pt
 * page, so 1.545px per point) and written here as absolute positions rather
 * than as offsets that accumulate. Absolute means a missing logo leaves the
 * gap it would have filled instead of dragging the rest of the page up.
 */
const LEFT = 56;
const RIGHT = 540;

/* Letterhead. */
const LOGO_LEFT = 44;
const LOGO_TOP_Y = 772;
const LOGO_HEIGHT = 30;
const BRAND_X = 81;
const HEAD_Y = 754;
const HEAD_SUB_Y = 741;
const BRAND_SIZE = 14;
const RECEIPT_TITLE_SIZE = 10;
const HEAD_SUB_SIZE = 9;
const HEAD_RULE_Y = 725;

/* The yatra and its date. */
const TITLE_Y = 690;
const TITLE_SIZE = 27;
const DATE_Y = 672;
const DATE_SIZE = 10;

/* The amount panel. */
const PANEL_TOP_Y = 653;
const PANEL_BOTTOM_Y = 574;
const PANEL_TEXT_X = 75;
const AMOUNT_LABEL_Y = 640;
const AMOUNT_LABEL_SIZE = 8.5;
const AMOUNT_Y = 598;
const AMOUNT_SIZE = 24;
const STAMP = { right: 521, top: 624, width: 46, height: 25, size: 13 };

/* The rows: labels flush left, values flush right. */
const ROW_TOP_Y = 532;
const ROW_GAP = 33.5;
/* Spacing between the lines of one value that wraps — an address, usually. */
const LINE_GAP = 19;
const BODY_SIZE = 15.5;
const VALUE_WIDTH = RIGHT - 230;
/* Floor for the last row's baseline, leaving the closing lines clear. */
const ROWS_BOTTOM_Y = 195;
/* How small a value may be set before it is cut instead of shrunk. */
const MIN_BODY_SIZE = 10;

/* Foot. */
const THANKS_Y = 167;
const THANKS_SIZE = 17;
const FOOT_SIZE = 8;
const FOOT_LINES_Y = [146, 134, 122, 110];

/**
 * The mark at the head of the receipt: public/iskcon-logo.svg.
 *
 * Drawn as vector paths rather than embedded as an image, so it stays sharp at
 * any zoom and costs only its path data. Every path is filled black whatever
 * colour the file uses: the receipt is black type, and a coloured mark prints
 * as a muddy grey on an office printer.
 *
 * Optional by design: a missing or unreadable logo must not cost a traveller
 * their receipt at the moment they have just paid. Because everything is
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

/** Greedy wrap, so a long address breaks across lines instead of off the page. */
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

const LONG_DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function tripDay(iso) {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : LONG_DAY.format(date).toUpperCase();
}

/**
 * "24 OCTOBER 2026 - 29 OCTOBER 2026" — the whole yatra, set under the title.
 * Falls back to the one day it has if either end is missing or unreadable.
 */
function tripDates() {
  const start = tripDay(TRIP.startDate);
  const end = tripDay(TRIP.endDate);
  if (start && end && start !== end) return `${start} - ${end}`;
  return start || end;
}

/**
 * Razorpay names the rail, the artwork names it the way a devotee would.
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
  card: "Card",
  emi: "EMI",
  "pay later": "Pay Later",
};

function paymentMode(mode) {
  const raw = String(mode || "").trim();
  if (!raw) return "Online";
  return `Online ${MODES[raw.toLowerCase()] || raw}`;
}

/**
 * The billing address.
 *
 * The registration form asks for it now, since Razorpay's checkout does not.
 * Registrations made before that paid through CCAvenue carry it in
 * `payment.raw`, echoed back from CCAvenue's billing page; anything older
 * than both prints a dash rather than "undefined".
 */
export function billingAddress(registration) {
  const typed = String(registration?.address || "").trim();
  if (typed) return typed;

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

/** Whole rupees, as the status row writes them: "2000". */
function rupees(registration) {
  return Math.round(Number(registration.amount) || 0);
}

/** The ten rows, in the artwork's order and with its wording. */
function rowsFor(registration) {
  const primary = registration.primary || {};
  const payment = registration.payment || {};

  return [
    ["Registration Number", registration.orderId],
    ["Registration Date", when(registration.createdAt)],
    ["Total Member", String(registration.travellerCount || 1).padStart(2, "0")],
    ["Billing Name", String(primary.name || "").toUpperCase()],
    ["Billing Address", billingAddress(registration).toUpperCase()],
    ["Mobile Number", primary.phone],
    ["Email", primary.email],
    ["Payment status", `${rupees(registration)} Rs. Paid`],
    ["Transaction Date", when(payment.paidAt)],
    ["Transaction Mode", paymentMode(payment.paymentMode)],
  ];
}

/** "https://yatra.iyfpatna.in/" -> "yatra.iyfpatna.in", for the foot. */
function siteHost() {
  return String(ORG.siteUrl || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
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
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const text = (value, { x, y, size, face = font, color = INK }) => {
    page.drawText(latin(value), { x, y, size, font: face, color });
  };
  const rightAligned = (value, { right = RIGHT, y, size, face = font, color = INK }) => {
    const safe = latin(value);
    page.drawText(safe, {
      x: right - face.widthOfTextAtSize(safe, size),
      y,
      size,
      font: face,
      color,
    });
  };
  const centred = (value, { y, size, face = font, color = INK }) => {
    const safe = latin(value);
    page.drawText(safe, {
      x: (A4[0] - face.widthOfTextAtSize(safe, size)) / 2,
      y,
      size,
      font: face,
      color,
    });
  };

  /* ---- Letterhead ------------------------------------------------------ */

  const logo = await loadLogo();
  if (logo) {
    try {
      const scale = LOGO_HEIGHT / logo.height;
      for (const { d, dx, dy } of logo.paths) {
        page.drawSvgPath(d, {
          x: LOGO_LEFT + dx * scale,
          y: LOGO_TOP_Y - dy * scale,
          scale,
          color: BLACK,
        });
      }
    } catch (error) {
      // A receipt without its mark still beats a 500 for someone who has paid.
      console.error("[receipt] logo could not be embedded", error);
    }
  }

  text("ISKCON PATNA", { x: BRAND_X, y: HEAD_Y, size: BRAND_SIZE, face: bold });
  text("BRAJ YATRA 2026", { x: BRAND_X, y: HEAD_SUB_Y, size: HEAD_SUB_SIZE, color: GREY });

  rightAligned("REGISTRATION ACKNOWLEDGEMENT RECEIPT", {
    y: HEAD_Y,
    size: RECEIPT_TITLE_SIZE,
    face: bold,
    color: SAFFRON,
  });
  rightAligned(registration.orderId, { y: HEAD_SUB_Y, size: HEAD_SUB_SIZE, color: GREY });

  page.drawLine({
    start: { x: LEFT, y: HEAD_RULE_Y },
    end: { x: RIGHT, y: HEAD_RULE_Y },
    thickness: 0.75,
    color: RULE,
  });

  /* ---- The yatra ------------------------------------------------------- */

  text("BRAJ YATRA 2026", { x: LEFT, y: TITLE_Y, size: TITLE_SIZE, face: italic });
  text(tripDates(), { x: LEFT, y: DATE_Y, size: DATE_SIZE, color: GREY });

  /* ---- Amount panel ---------------------------------------------------- */

  page.drawRectangle({
    x: LEFT,
    y: PANEL_BOTTOM_Y,
    width: RIGHT - LEFT,
    height: PANEL_TOP_Y - PANEL_BOTTOM_Y,
    color: PANEL,
    borderColor: PANEL_EDGE,
    borderWidth: 0.75,
  });
  text("Amount paid", {
    x: PANEL_TEXT_X,
    y: AMOUNT_LABEL_Y,
    size: AMOUNT_LABEL_SIZE,
    color: GREY,
  });
  text(`INR ${rupees(registration).toFixed(2)}`, {
    x: PANEL_TEXT_X,
    y: AMOUNT_Y,
    size: AMOUNT_SIZE,
    face: bold,
  });

  page.drawRectangle({
    x: STAMP.right - STAMP.width,
    y: STAMP.top - STAMP.height,
    width: STAMP.width,
    height: STAMP.height,
    borderColor: GREEN,
    borderWidth: 2,
  });
  centredIn("PAID", {
    page,
    face: bold,
    size: STAMP.size,
    left: STAMP.right - STAMP.width,
    width: STAMP.width,
    y: STAMP.top - STAMP.height / 2 - STAMP.size * 0.36,
    color: GREEN,
  });

  /* ---- The rows -------------------------------------------------------- */

  const rows = rowsFor(registration).map(([label, value]) => ({
    label,
    ...fitValue(value, font, VALUE_WIDTH),
  }));

  /* Ten single-line rows sit at exactly the artwork's spacing. A booking whose
     values wrap onto more lines than the page has room for — a long name and a
     long address together — has every gap closed by the same proportion, so
     the rows stay off the closing lines rather than running over them. */
  const extraLines = rows.reduce((total, row) => total + row.lines.length - 1, 0);
  const needed = (rows.length - 1) * ROW_GAP + extraLines * LINE_GAP;
  const squeeze = Math.min(1, (ROW_TOP_Y - ROWS_BOTTOM_Y) / needed);

  let y = ROW_TOP_Y;

  for (const row of rows) {
    text(row.label, { x: LEFT, y, size: BODY_SIZE });

    row.lines.forEach((line, index) => {
      if (index > 0) y -= LINE_GAP * squeeze;
      rightAligned(line, { y, size: row.size });
    });
    y -= ROW_GAP * squeeze;
  }

  /* ---- Foot ------------------------------------------------------------ */

  centred("Thank you! Hare Krishna.", {
    y: THANKS_Y,
    size: THANKS_SIZE,
    face: italic,
    color: SAFFRON,
  });

  const host = siteHost();
  const footLines = [
    `Collected on behalf of International Society for Krishna Consciousness (ISKCON), Patna`,
    ORG.address,
    `${host ? `${host}. ` : ""}This is a computer-generated receipt and needs no signature.`,
  ];
  footLines.forEach((line, index) => {
    centred(line, { y: FOOT_LINES_Y[index], size: FOOT_SIZE, color: GREY });
  });
  drawHelplines(page, font, FOOT_LINES_Y[3]);

  pdf.setTitle(`Registration receipt ${registration.orderId}`);
  pdf.setAuthor("ISKCON Patna");
  pdf.setSubject("BRAJ YATRA 2026");
  pdf.setCreator("ISKCON Patna");

  return pdf.save();
}

/** Centres one string inside a box, for the PAID stamp. */
function centredIn(value, { page, face, size, left, width, y, color }) {
  page.drawText(value, {
    x: left + (width - face.widthOfTextAtSize(value, size)) / 2,
    y,
    size,
    font: face,
    color,
  });
}

/**
 * "For more information, call Youth - 9031683002, 9031054013 | Family - …",
 * centred, with each number underlined as the artwork has it. Drawn as a run
 * of pieces because pdf-lib has no underline: measuring every piece first is
 * what keeps the whole line truly centred.
 */
function drawHelplines(page, font, y) {
  const pieces = [{ text: "For more information, call " }];
  const groups = [
    ["Youth", HELPLINES.youth],
    ["Family", HELPLINES.family],
  ].filter(([, numbers]) => numbers.length);

  groups.forEach(([label, numbers], groupIndex) => {
    if (groupIndex > 0) pieces.push({ text: " | " });
    pieces.push({ text: `${label} - ` });
    numbers.forEach((number, index) => {
      if (index > 0) pieces.push({ text: ", " });
      pieces.push({ text: latin(number), underline: true });
    });
  });

  const widths = pieces.map((piece) => font.widthOfTextAtSize(piece.text, FOOT_SIZE));
  let x = (A4[0] - widths.reduce((sum, w) => sum + w, 0)) / 2;

  pieces.forEach((piece, index) => {
    page.drawText(piece.text, { x, y, size: FOOT_SIZE, font, color: INK });
    if (piece.underline) {
      page.drawLine({
        start: { x, y: y - 1.2 },
        end: { x: x + widths[index], y: y - 1.2 },
        thickness: 0.5,
        color: INK,
      });
    }
    x += widths[index];
  });
}
