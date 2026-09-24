const INTEREST_CATEGORIES = new Set([
  "Upcoming event or booking",
  "Private group or retreat",
  "Venue or studio partnership",
  "Workplace or organisation",
  "Something else",
]);

function singleLine(value, maximumLength, required = true) {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new Error("Invalid contact field");
  }
  const result = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if ((required && !result) || result.length > maximumLength) throw new Error("Invalid contact field");
  return result;
}

function messageText(value) {
  if (typeof value !== "string") throw new Error("Invalid contact field");
  const result = value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  if (!result || result.length > 5000) throw new Error("Invalid contact field");
  return result;
}

export function validateContactInput(input) {
  if (!input || Object.prototype.toString.call(input) !== "[object Object]") {
    throw new Error("Invalid contact request");
  }

  const name = singleLine(input.name, 120);
  const email = singleLine(input.email, 254).toLowerCase();
  const phone = singleLine(input.phone ?? "", 60, false);
  const interestCategory = singleLine(input.interestCategory, 120);
  const message = messageText(input.message);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid contact field");
  if (phone && !/^[0-9+()\-.\s]{5,60}$/.test(phone)) throw new Error("Invalid contact field");
  if (!INTEREST_CATEGORIES.has(interestCategory)) throw new Error("Invalid contact field");

  return { name, email, phone, interestCategory, message };
}
