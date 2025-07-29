export interface Hearings {
  id?: string;
  newApplicationEmail?: boolean;
  judgeID?: string;
  judgeName?: string;
  judgeNewHearingAssignedEmailed?: boolean;
  bookingID?: string;
  eventID?: string;
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
  offenderName?: string; // Offenders full name
  offenderID?: string; // The ID of the offender this hearing is for
  grantBailChecked?: any; // Checkbox if bail is granted or not
  grantBailEmail?: boolean;
  deniedBailChecked?: any;
  denyBailEmail?: boolean;
  deniedBailReason?: string;
  deniedBailUnixTime?: string;
  holdRulingChecked?: any;
  holdRulingEmail?: boolean;
  bailReportLocation?: string; // May be any or the name of the police station
  bailReportDays?: string;
  bailReportTime?: string;
  sundayChecked?: any; // Sunday must report on this day
  mondayChecked?: any; // Monday must report on this day
  tuesdayChecked?: any; // Tuesday must report on this day
  wednesdayChecked?: any; // Wednesday must report on this day
  thursdayChecked?: any; // Thursday must report on this day
  fridayChecked?: any; // Friday must report on this day
  saturdayChecked?: any; // Saturday must report on this day
  threepmChecked?: any; // Three PM must report before 3PM
  fourpmChecked?: any; // Four PM must report before 4PM
  fivepmChecked?: any; // Five PM must report before 5PM
  sixpmChecked?: any; // Six PM must report before 6PM
  sevenpmChecked?: any; // Seven PM must report before 7PM
  eightpmChecked?: any; // Eight PM must report before 8PM
  ninepmChecked?: any; // Nine PM must report before 9PM
  tenpmChecked?: any; // Ten PM must report before 10PM
  suretyReq?: string;
  surrenderPassportChecked?: any;
  elecMonitorChecked?: any;
  additionalConditions?: string;
  judicialNotes?: string;
  registrarAck?: boolean;
  registrarAckDate?: string;
  signatureData?: string;
  active?: boolean; // pending, active, closed
  suretorNIB?: string;
  suretorName?: string;
  suretor2NIB?: string;
  suretor2Name?: string;
  released?: boolean;
  checkLocation?: string;
  bailstatus?: string;
  attorneyName?: string;
  attorneyID?: string;
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
  hearingDateReadable?: string;
  status?: string;
  bondHtml?: string;
}

