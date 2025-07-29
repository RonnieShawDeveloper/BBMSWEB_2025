import {Count} from "./count";

export interface Booking {
  id?: string;
  linkedOffenderID?: string;
  judgeID?: string;
  courtroom?: string;
  court?: string;
  afisID?: string; // Links the booking to the offender
  offender?: string;
  offenderName?: string; // Full name of the offender
  lastName?: string; // Last name of the offender
  firstName?: string; // First name of the offender
  middleName?: string; // Middle name of the offender
  dob?: string;
  address1?: string;
  address2?: string;
  locality?: string;
  island?: string;
  bookingComments?: string;
  bookDate?: string|number;
  bookTime?: string;
  genRegisterNumber?: string;
  maritialStatus?: string;
  children?: string;
  occupation?: string;
  famMembName1?: string;
  famMembAdd1?: string;
  famMembReligion1?: string;
  famMembName2?: string;
  famMembAdd2?: string;
  famMembReligion2?: string;
  famMembName3?: string;
  famMembAdd3?: string;
  famMembReligion3?: string;
  classification?: string;
  empName?: string;
  empAddress?: string;
  empSup?: string;
  empSupPhone?: string;
  empPosition?: string;
  agency?: string;
  agencyCase?: string;
  arrestAddress?: string;
  comments?: string;
  drugRelated?: string;
  alcoholRelated?: string;
  sexCrime?: string;
  childCrime?: string;
  violenceCrime?: string;
  sexOffender?: string;
  gangHistory?: string;
  housingLoc?: string;
  gangAffil?: string;
  bookingStatus?: string; // Open, Closed, Bond, Deleted
  bookingChargeDocs?: string;
  bookingCounts?: string;
  bailAppPending?: boolean;
  bailAppSubmitedDate?: string;
  judgeAssigned?: string;
  hearingSet?: string;
  attorneyAssigned?: string; // Attorney Name
  attorneyID?: string; // Attorney ID
  attorneyStatus?: string; // pending or granted
  attorneyAssignedDate?: string; // Date Granted Access
  bailStatus?: string;
  suretorStatus?: string;
  suretorName?: string;
  suretorAssignDate?: string;
  suretorNIB?: string;
  suretorDOB?: string;
  suretorStatus2?: string;
  suretorName2?: string;
  suretorAssignDate2?: string;
  suretorNIB2?: string;
  suretorDOB2?: string;
  conditionsChecked?: string;
  kioskAssigned?: string;
  offenderReleased?: string;
  judge?: string;
  judgeAssignedDate?: string;
  hearingAssignDate?: string;
  bondSignaturePin?: string;
  pinEntered?: string;
  judgeSignature?: string;
  charges?: Array<Count>;
  photoURL?: string;

  variation?: boolean;
  variationAddress?: string;
  variationPhone?: string;
  variationStatus?: string; // pending, approved, denied
  variationReason?: string;
  variationRequestedBy?: string;
  variationRelation?: string;
  variationGrantedBy?: string;
  variationDateCreated?: string;
  variationHearingDate?: string;
  variationHearingJustice?: string;
  variationJusticeID?: string;
  variationPdfUrl?: string;
  hearingDateUnix?: string;
  offenderID?: string;
  grantBailChecked?: any;
  grantBailEmail?: boolean;
  deniedBailChecked?: any;
  denyBailEmail?: boolean;
  deniedBailReason?: string;
  deniedBailUnixTime?: string;
  holdRulingChecked?: any;
  holdRulingEmail?: boolean;
  bailReportLocation?: string;
  bailReportDays?: string;
  bailReportTime?: string; // Time offender must checkin before
  sundayChecked?: any; // Sunday Bail report day
  mondayChecked?: any; // Monday Bail report day
  tuesdayChecked?: any; // Tuesday Bail report day
  wednesdayChecked?: any; // Wednesday Bail report day
  thursdayChecked?: any; // Thursday Bail report day
  fridayChecked?: any; // Friday Bail report day
  saturdayChecked?: any; // Saturday Bail report day
  suretyReq?: string;
  surrenderPassportChecked?: any;
  elecMonitorChecked?: any;
  additionalConditions?: string;
  judicialNotes?: string;
  registrarAck?: boolean;
  registrarAckDate?: string;
  signatureData?: string;
  active?: boolean; // pending, active, closed
  released?: boolean;
  checkLocation?: string; // May say Any or Station Name
  bailstatus?: string;
  custodyStatus?: string;
  attorneyName?: string;
  aogResp?: boolean;
  aogRespDate?: string;
  comment?: string;
  disposition?: string;
  unixDate?: string;
  bailAppLink?: string;
  bailBondLink?: string;
  bailBondIssueDateUnix?: string;
  bailBondEmailed?: boolean;
  terminationComment?: string;
  terminationDate?: string;
  terminationType?: string;
  releaseOnRecognizance?: boolean;
  bailAmount?: string;
  unlockCode?: string;
  magistrateEmailSent?: boolean;
  lateCheckin?: boolean;
}
