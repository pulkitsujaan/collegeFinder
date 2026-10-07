/** Formatting helpers. Indian numbering throughout — ₹4,80,000, not ₹480,000. */

const inr = new Intl.NumberFormat('en-IN');

/** Full rupees: 480000 → "₹4,80,000" */
export function formatRupees(amount) {
  if (amount == null) return '—';
  return `₹${inr.format(Math.round(amount))}`;
}

/**
 * Compact rupees for cards and chips: 480000 → "₹4.8 L", 12500000 → "₹1.25 Cr".
 * Indian usage: lakh and crore, not million.
 */
export function formatRupeesCompact(amount) {
  if (amount == null) return '—';
  const value = Math.round(amount);
  if (value >= 1_00_00_000) return `₹${trim(value / 1_00_00_000)} Cr`;
  if (value >= 1_00_000) return `₹${trim(value / 1_00_000)} L`;
  if (value >= 1_000) return `₹${trim(value / 1_000)} K`;
  return `₹${inr.format(value)}`;
}

/**
 * Salary packages are stored in LPA (lakhs per annum). Above 100 LPA we switch
 * to crore a year, which is how the number is actually quoted in India.
 */
export function formatPackage(lpa) {
  if (lpa == null) return '—';
  if (lpa >= 100) return `₹${trim(lpa / 100)} Cr`;
  return `₹${trim(lpa)} LPA`;
}

export function formatPackageShort(lpa) {
  if (lpa == null) return '—';
  if (lpa >= 100) return `₹${trim(lpa / 100)} Cr`;
  return `₹${trim(lpa)} L`;
}

function trim(value) {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function formatNumber(value) {
  if (value == null) return '—';
  return inr.format(value);
}

export function formatCount(value, singular, plural = `${singular}s`) {
  const count = formatNumber(value);
  return `${count} ${value === 1 ? singular : plural}`;
}

/** "2027-01-24" → "24 Jan 2027". Parsed as a plain date, not UTC midnight. */
export function formatDate(iso) {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDuration(years) {
  if (years == null) return '—';
  if (Number.isInteger(years)) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years} years`;
}

export function formatRating(rating) {
  if (rating == null) return '—';
  return rating.toFixed(1);
}

/** Days until an ISO date; negative when it has passed. */
export function daysUntil(iso) {
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86_400_000);
}

/** "in 12 days" / "3 days ago" / "today" — for the exam calendar. */
export function relativeDay(iso) {
  const days = daysUntil(iso);
  if (days == null) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  if (days === -1) return 'yesterday';
  return `${Math.abs(days)} days ago`;
}

export function titleCase(text) {
  return text.replace(/\b\w/g, (character) => character.toUpperCase());
}
