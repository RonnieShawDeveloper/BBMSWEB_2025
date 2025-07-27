// Existing Suretor interface (old format) - KEEP THIS FOR BACKWARD COMPATIBILITY
export interface Suretor {
  id?: string;
  spn?: string;
  NIB?: string; // Note: This is NIB in the old format, but nib in the new nested format
  lastName?: string;
  firstName?: string;
  middleName?: string;
  addressFull?: string;
  poBox?: string;
  phone?: string;
  email?: string;
  locality?: string;
  island?: string;
  geotag?: string;
  empName?: string;
  empAddress?: string;
  empLocality?: string;
  empIsland?: string;
  empPhone?: string;
  empPosition?: string;
  empSupervisor?: string;
  empEmail?: string;
  active?: boolean;
  amountOwed?: string;
  magistrateCourt?: string;
  propertyPledged?: string;
  offenderPledged?: string;
  bookingPledged?: string;
  marker?: string;
  linkedOffender?: boolean;
  offenderNIB?: string;
  ofenderCase?: string;
  status?: string;
  immovablePropDesc?: string; // Old format might have some similar fields, but not nested
  immovablePropValue?: string;
  immovableAddress?: string;
  immovableLocality?: string;
  immovableIsland?: string;
  immovableDeedDate?: string;
  immovableOtherNames?: string;
  bankName?: string;
  bankAccountType?: string;
  bankBalance?: string;
  movablePropAdditional?: string;
  mortgageWith?: string;
  signature?: string;
  AIComments?: string;
}

// New interfaces mirroring the Kotlin SuretyApplication data model from the Android app
// This is the new format for the SuretyApplication document in Firestore for the Supreme Court

export interface MoveableAsset {
  description: string;
  estimatedValue: number;
}

export interface BankAccount {
  bankName: string;
  accountType: string;
  accountBalance: number;
}

export interface ImmovableProperty {
  particulars: string;
  estimatedValue: number;
}

// Note: For Timestamp, Firebase JS SDK's Timestamp type is ideal.
// If not using Firebase JS SDK, you might use Date, but Timestamp is more precise.
// Assuming Firebase JS SDK is available in your Angular project.
import { Timestamp } from '@angular/fire/firestore'; // Import Firebase Timestamp

export interface Surety {
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  address: string;
  nib: string; // This is 'nib' (lowercase) in the new nested format
  dob: Timestamp | null; // Firebase Timestamp
  email: string;
  phone: string;
  phone2: string; // Optional second phone number
  poBox: string;
  spn: string;
  empName: string;
  empAddress: string;
  empPhone: string;
  immovableProperty: ImmovableProperty;
  bankAccount: BankAccount;
  otherMoveableProperty: MoveableAsset[]; // Array of MoveableAsset
}

export interface CaseDetails {
  defendantName: string;
  defendantAddress: string;
  bondAmount: number;
  court: string;
}

export interface Declarations {
  encumbranceStatus: string;
  mortgageHolder: string | null;
  priorSuretyCases: string;
  hasPendingCriminalCharges: boolean;
  isCurrentlySurety: boolean;
}

export interface Execution {
  suretySignatureUrl: string;
  dateSigned: Timestamp; // Firebase Timestamp
  attestingOfficialName: string;
}

export interface Metadata {
  status: string;
  scannedAt: Timestamp; // Firebase Timestamp
  scannedByUserId: string;
  reviewedAt: Timestamp | null; // Firebase Timestamp
  reviewedByUserId: string | null;
  originalImageUrls: string[];
}

// Top-level interface for the new SuretyApplication document structure
export interface SuretyApplication {
  applicationId: string;
  caseDetails: CaseDetails;
  surety: Surety;
  declarations: Declarations;
  execution: Execution;
  metadata: Metadata;
  aiComments: { [key: string]: string }; // Map for AI comments
  approval: string;
}
