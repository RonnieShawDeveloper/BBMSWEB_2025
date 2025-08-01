export interface BookingEvents {
  id?: string; // Unique identifier for the event
  offenderID?: string; // Offender ID found that links to the users collection
  offenderName?: string; // Full name of the offender
  offenderDOB?: string; // Date of birth of the offender
  bookingID?: string; // Booking ID that links to the current bookings collection record
  type?: string; // type of event (e,g, "bailApp", "newBooking", "note", "pdf", etc)
  title?: string; // Title of the event
  description?: string; // Description of the event
  link?: string; // Link to storage file or external link
  date?: string; // Date of the event in ISO format
  unixDate?: string; // Unix timestamp of the event date
  hearingDateSet?: string; // Date when the hearing was set, if applicable
  disposition?: string; // Disposition of the event (e.g., "approved", "denied", "pending")
  status ?: string; // Status of the event (e.g., "active", "archived")
  judge?: string; // Name of the judge associated with the event
  judgeID?: string; // ID of the judge associated with the event
  comment?: string; // Additional comments or notes about the event
  approved?: boolean; // Indicates if bail was approved
  denied?: boolean; // Indicates if bail was denied
  magistrateEmailed?: boolean; // Indicates if the magistrate was emailed about the event
}
