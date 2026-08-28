import { PAYMENT_STATUSES, REGISTRATION_TYPES } from "./config";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Shared by the admin list and the CSV export so "download" always returns
 * exactly the rows the coordinator is looking at.
 */
export function buildFilter(searchParams) {
  const filter = {};

  const type = searchParams.get("type");
  if (REGISTRATION_TYPES.includes(type)) filter.type = type;

  const status = searchParams.get("status");
  if (PAYMENT_STATUSES.includes(status)) filter["payment.status"] = status;

  const q = (searchParams.get("q") || "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { orderId: rx },
      { "primary.name": rx },
      { "primary.email": rx },
      { "primary.phone": rx },
      { "primary.whatsapp": rx },
      { "primary.facilitator": rx },
      { "members.name": rx },
      { "members.email": rx },
      { "members.phone": rx },
      { "members.whatsapp": rx },
    ];
  }

  return filter;
}

export const STATS_PIPELINE_GROUP = {
  _id: null,
  registrations: { $sum: 1 },
  travellers: { $sum: "$travellerCount" },
  paid: { $sum: { $cond: [{ $eq: ["$payment.status", "success"] }, 1, 0] } },
  collected: {
    $sum: { $cond: [{ $eq: ["$payment.status", "success"] }, "$amount", 0] },
  },
};

export const EMPTY_STATS = {
  registrations: 0,
  travellers: 0,
  paid: 0,
  collected: 0,
};
