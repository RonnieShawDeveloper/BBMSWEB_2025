export interface Afis {
  index?: number; // Automated by the system - Not shown on forms
  id?: string; // Afis number created from a unix timestamp in seconds or TEMP Number
  fName?: string; // First name of the person
  mName?: string; // Middle name of the person
  lName?: string; // Last name of the person
  spn?: string; // SPN number of the person
  dob?: string; // Date of birth of the person in M-D-YYYY format
  afis?: string; // Bahamas, BBMS, SO, Police, etc - It provides the source of the record
  officer?: string; // Intake officer who created the record
  location?: string; // Location where the record was created, e.g., Police Station, Court, etc.
  comment?: string; // Comment or notes about the record
  datetime?: string; // Date and time when the record was created in "M/D/YYYY h:m:ss AM/PM" format
  address1?: string; // First line of the address
  address2?: string; // Second line of the address
  locality?: string; // Locality or city of the address
  island?: string; // Island of the address, e.g., New Providence, Grand Bahama, etc.
  country?: string; // Country of the address, e.g., Bahamas, USA, etc.
  alias?: string; // Alias or other names used by the person
  citizenship?: string; // Citizenship of the person, e.g., Bahamian, American, etc.
  sex?: string; // Male or Female
  race?: string; // Black, White, Hispanic, Asian, etc.
  height?: string; // Height of the person in feet and inches, e.g., 5'10"
  weight?: string; // Weight of the person in pounds, e.g., 180 lbs
  pob?: string; // Place of birth of the person, e.g., Nassau, Freeport, etc.
  eyes?: string; // Eye color of the person, e.g., Brown, Blue, Green, etc.
  hair?: string; // Hair color of the person, e.g., Black, Brown, Blonde, etc.
  lat?: string; // Latitude of the location where the record was created
  long?: string; // Longitude of the location where the record was created
  bbms?: string; // Not Shown on Forms
}
