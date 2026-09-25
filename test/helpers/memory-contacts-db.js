export class MemoryContactsDb {
  constructor() {
    this.contacts = [];
    this.enquiries = [];
    this.consents = [];
  }

  prepare(sql) {
    return new MemoryStatement(this, sql);
  }

  async batch(statements) {
    for (const statement of statements) statement.applyBatch();
    return statements.map(() => ({ success: true }));
  }
}

class MemoryStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, " ").trim();
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  applyBatch() {
    if (this.sql.startsWith("INSERT INTO contacts")) {
      const [firstName, lastName, email, normalizedEmail, phone, contactType, source, sourceUrl,
        utmSource, utmMedium, utmCampaign, utmContent, utmTerm, firstContactAt, lastActivityAt] = this.values;
      let contact = this.db.contacts.find((item) => item.email_normalized === normalizedEmail);
      if (!contact) {
        contact = {
          id: this.db.contacts.length + 1,
          first_name: firstName,
          last_name: lastName,
          email,
          email_normalized: normalizedEmail,
          phone,
          contact_type: contactType,
          status: "active",
          first_source: source,
          first_source_url: sourceUrl,
          first_utm_source: utmSource,
          first_utm_medium: utmMedium,
          first_utm_campaign: utmCampaign,
          first_utm_content: utmContent,
          first_utm_term: utmTerm,
          first_contact_at: firstContactAt,
          last_activity_at: lastActivityAt,
        };
        this.db.contacts.push(contact);
      } else {
        if (firstName) contact.first_name = firstName;
        if (lastName) contact.last_name = lastName;
        if (phone) contact.phone = phone;
        contact.email = email;
        if (contact.contact_type === "other" || (contact.contact_type === "consumer" && !["consumer", "other"].includes(contactType))) {
          contact.contact_type = contactType;
        }
        contact.last_activity_at = lastActivityAt;
      }
      return;
    }
    if (this.sql.startsWith("INSERT INTO enquiries")) {
      const [submissionId, enquiryType, message, source, sourceUrl, utmSource, utmMedium,
        utmCampaign, utmContent, utmTerm, submittedAt, normalizedEmail] = this.values;
      if (this.db.enquiries.some((item) => item.submission_id === submissionId)) return;
      const contact = this.db.contacts.find((item) => item.email_normalized === normalizedEmail);
      this.db.enquiries.push({
        id: this.db.enquiries.length + 1,
        submission_id: submissionId,
        contact_id: contact.id,
        enquiry_type: enquiryType,
        message,
        source,
        source_url: sourceUrl,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        submitted_at: submittedAt,
        status: "new",
        admin_notes: "",
        notification_status: "pending",
      });
      return;
    }
    if (this.sql.startsWith("INSERT INTO contact_consents")) {
      const [submissionId, source, consentText, consentVersion, recordedAt, normalizedEmail] = this.values;
      if (this.db.consents.some((item) => item.submission_id === submissionId)) return;
      const contact = this.db.contacts.find((item) => item.email_normalized === normalizedEmail);
      this.db.consents.push({
        id: this.db.consents.length + 1,
        submission_id: submissionId,
        contact_id: contact.id,
        consent_type: "marketing_email",
        status: "granted",
        source,
        consent_text: consentText,
        consent_version: consentVersion,
        recorded_at: recordedAt,
      });
    }
  }

  async first() {
    if (this.sql.startsWith("SELECT id, contact_id, submission_id, notification_status FROM enquiries")) {
      return this.db.enquiries.find((item) => item.submission_id === this.values[0]) || null;
    }
    if (this.sql.startsWith("UPDATE enquiries SET notification_status = 'sending'")) {
      const enquiry = this.db.enquiries.find((item) => item.submission_id === this.values[1]);
      if (!enquiry || !["pending", "failed"].includes(enquiry.notification_status)) return null;
      enquiry.notification_status = "sending";
      enquiry.notification_attempted_at = this.values[0];
      return { id: enquiry.id };
    }
    if (this.sql.startsWith("SELECT notification_status FROM enquiries")) {
      const enquiry = this.db.enquiries.find((item) => item.submission_id === this.values[0]);
      return enquiry ? { notification_status: enquiry.notification_status } : null;
    }
    return null;
  }

  async run() {
    if (this.sql.startsWith("UPDATE enquiries SET notification_status = ?")) {
      const enquiry = this.db.enquiries.find((item) => item.submission_id === this.values[3]);
      if (enquiry) enquiry.notification_status = this.values[0];
    }
    return { success: true };
  }
}
