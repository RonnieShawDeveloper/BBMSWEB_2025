export interface KioskCheckin {
  afisID: string; // Links the offender to the check-in
  datetime: string;
  location: string; // Police station the offender checked in at
  name: string; // Offender name
  photoURL?: string;
  unix: string; // Unix timestamp of the check-in
}
