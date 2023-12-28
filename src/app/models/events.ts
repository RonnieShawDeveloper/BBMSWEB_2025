export interface BookingEvents {
  id?: string;
  offenderID?: string;
  offenderName?: string;
  offenderDOB?: string;
  bookingID?: string;
  type?: string;
  title?: string;
  description?: string;
  link?: string;
  date?: string;
  unixDate?: string;
  hearingDateSet?: string;
  disposition?: string;
  status ?: string;
  judge?: string;
  judgeID?: string;
  comment?: string;
  approved?: boolean;
  denied?: boolean;
  magistrateEmailed?: boolean;
}
