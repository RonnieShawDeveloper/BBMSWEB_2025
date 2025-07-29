export interface Offender {
  id?: string;
  alias?: string;
  lName?: string; // Last name of the offender
  fName?: string; // First name of the offender
  mName?: string; // Middle name of the offender
  alerts?: string;
  addLine1?: string;
  addLine2?: string;
  bailStatus?: string;
  bookedStatus?: string;
  build?: string;
  city?: string;
  classification?: string;
  complex?: string;
  dob?: string;
  email?: string;
  empAddress?: string;
  empLocality?: string;
  empIsland?: string;
  empName?: string;
  empPhone?: string;
  empSuper?: string;
  empPosition?: string;
  empEmail?: string;
  eyeColor?: string;
  gender?: string;
  hairColor?: string;
  height?: string;
  location?: string;
  locked?: string;
  openCase?: string;
  phone?: string;
  pob?: string;
  homePhone?: string;
  profileNotes?: string;
  race?: string;
  spn?: string; // afisID used to identify the offender in the system
  nib?: string; // National Insurance Number may be used to link some offender records
  state?: string;
  status?: any;
  visible?: string;
  weight?: string;
  zip?: string;
  emergContact?: string;
  emergRelation?: string;
  mainPhoto?: string;
  jetAfis?: string;
  passport?: string;
  assignedJudge?: string;
  lastBailHearingDate?: string;
  attorneyName?: string; // The assigned Attorney Name to this offender
  attorneyID?: string;
  attorneyAdded?: string;
  attorneyRecord?: attorneyRecord[]; // The Assigned Attorneys
  attorneyAppRecordID?: string; // Database ID from attyApplications for this record
  lateCheckin?: boolean
}
export interface attorneyRecord {
  firebaseID?: string;
  lastName?: string;
  firstName?: string;
  address?: string;
  phone1?: string;
  phone2?: string;
  barNumber?: string;
}

