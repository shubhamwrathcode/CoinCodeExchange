/**
 * Display helpers for `GET /api/v1/kyb/status` (slim SessionPayload).
 * Do not render verifications, documents, or webhook bodies in the user app.
 */

export function kybDisplayDash(value) {
  const s = value == null ? "" : String(value).trim();
  return s || "—";
}

export function pickKybBusinessName(payload) {
  return kybDisplayDash(
    payload?.legal_name
    || payload?.legalName
    || payload?.businessName
    || payload?.companyName
    || payload?.registeredCompanyName
  );
}

export function pickKybApplicationId(payload) {
  return kybDisplayDash(
    payload?.application_id
    || payload?.applicationId
    || payload?.session_id
    || payload?.sessionId
    || payload?.verificationSessionId
  );
}

/** `May 21, 2025 • 10:30 AM (UTC)` from `verified_at` / `updated_at`. */
export function formatKybVerifiedAtUtc(payload) {
  const raw =
    payload?.verified_at
    || payload?.verifiedAt
    || payload?.updated_at
    || payload?.updatedAt;
  if (raw == null || raw === "") return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
  return `${date} • ${time} (UTC)`;
}

export function pickKybFailureReasons(payload) {
  const list = Array.isArray(payload?.rejectionReasons) ? payload.rejectionReasons : [];
  const fromList = list
    .map((item) => {
      if (item == null) return "";
      if (typeof item === "string" || typeof item === "number") return String(item);
      return String(item.reason || item.message || item.detail || "").trim();
    })
    .filter(Boolean);
  if (fromList.length) return fromList;
  const single = payload?.reason || payload?.reject_reason || payload?.rejection_reason || "";
  if (String(single).trim()) return [String(single).trim()];
  return [];
}

/** Drop verification/document/webhook blobs before UI state. */
export function slimKybStatusPayload(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const {
    verifications,
    documents,
    document,
    webhook,
    webhook_body,
    webhookBody,
    raw_webhook,
    rawWebhook,
    didit_webhook,
    diditWebhook,
    ...rest
  } = raw;
  return rest;
}

/**
 * KYC-style CTA rules for KYB (same as web `getKybCtaConfig`).
 */
export function getKybCtaConfig({ canonicalStatus, diditStatus } = {}) {
  const st = String(canonicalStatus || "").toUpperCase();
  const vendor = String(diditStatus || "").trim();
  const inProgress = vendor === "In Progress";

  if (st === "APPROVED") {
    return { show: false, label: "", variant: "none" };
  }
  if (st === "REJECTED") {
    return { show: true, label: "Try Again", variant: "retry" };
  }
  if (st === "RESUBMISSION_REQUESTED") {
    return { show: true, label: "Start verification", variant: "resubmit" };
  }
  if (st === "PENDING") {
    if (inProgress) {
      return { show: true, label: "Continue KYB Verification", variant: "continue" };
    }
    return { show: false, label: "", variant: "review" };
  }
  if (st === "EXPIRED") {
    return { show: true, label: "Start KYB Verification", variant: "start" };
  }
  return { show: true, label: "Start KYB Verification", variant: "start" };
}

export const KYB_REQUIRED_DOCS = [
  { title: "Certificate of Incorporation", sub: "Business incorporation certificate" },
  { title: "Business Registration Document", sub: "Official business registration certificate" },
  { title: "Beneficial Owner Information", sub: "Details of ultimate beneficial owners (UBO)" },
  { title: "Company Structure / Ownership Proof", sub: "Shareholding structure and ownership proof" },
  { title: "Board Resolution (If Applicable)", sub: "Board resolution authorizing account opening" },
  { title: "Proof of Business Address", sub: "Recent utility bill or bank statement" },
];

export const KYB_UNLOCKED = [
  { title: "Higher Limits", sub: "Increased deposit, withdrawal and trading limits." },
  { title: "Full Platform Access", sub: "Access all products and platform features." },
  { title: "Institutional Services", sub: "Get access to institutional and OTC services." },
  { title: "P2P & Fiat Services", sub: "Use P2P trading and fiat on/off ramp services." },
  { title: "Priority Support", sub: "Enjoy priority support for verified businesses." },
];

export const KYB_FAQ = [
  { q: "What is KYB verification?", a: "KYB verification on Coincode confirms that a business is legitimate and authorized to open an institutional or corporate account." },
  { q: "Why is KYB verification required?", a: "KYB is required on Coincode to meet UAE regulatory standards and to help prevent fraud, money laundering, and illicit activity." },
  { q: "What documents are required for KYB verification?", a: "You will need incorporation certificates, UBO details, proof of address, and other documents requested in the Coincode KYB flow." },
  { q: "How long does KYB verification take?", a: "Typically 1–3 business days after all correct documents are submitted through Coincode. Status updates appear on your KYB page." },
  { q: "Can I update my business information after verification?", a: "Yes. Contact Coincode support at support@arabglobal.ae to update your business details. Additional verification may be required." },
  { q: "Is my business information safe and secure?", a: "Yes. Coincode encrypts business data and handles it in line with our security and privacy standards." },
  { q: "What happens if my KYB verification is rejected?", a: "Coincode will notify you with the reason. You can resubmit the required documents from the KYB page or open a ticket at support@arabglobal.ae." },
];
