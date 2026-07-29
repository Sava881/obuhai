export function normalizePhone(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("8") && digits.length === 11) {
    digits = `7${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    digits = `7${digits}`;
  }

  if (!digits.startsWith("7") || digits.length !== 11) {
    return "";
  }

  return `+${digits}`;
}

export function phoneToLoginEmail(value) {
  const phone = normalizePhone(value);
  if (!phone) return "";
  return `${phone.replace(/\D/g, "")}@login.rabochiy-obzor.local`;
}

export function formatPhoneInput(value) {
  let digits = String(value || "").replace(/\D/g, "");

  if (digits.startsWith("8") || digits.startsWith("7")) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 10);
  let result = "+7";

  if (digits.length > 0) result += ` (${digits.slice(0, 3)}`;
  if (digits.length >= 3) result += ")";
  if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) result += `-${digits.slice(8, 10)}`;

  return result;
}
