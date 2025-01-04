export interface Count {
  total?: number;
  submitted?: number;
  approved?: number;
  denied?: number;
  id?: string;
  offenderID?: string;
  bookingID?: string;
  chargeDocID?: string;
  chargeDocNumber?: string;
  countNo?: string;
  countDate?: string;
  countCharge?: string;
  isDrug?: boolean;
  isAlcohol?: boolean;
  isSexcrime?: boolean;
  isChildcrime?: boolean;
  isViolent?: boolean;
  countComment?: string;
  unixDate?: number|string;
}
