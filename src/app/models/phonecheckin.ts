import {SafeUrl} from "@angular/platform-browser";

export interface Phonecheckin {
  id?: string;
  BBMSID?: string; // Offender ID for the collection users (users.id)
  AFISID?: string; // afis ID found in the collection: users.spn
  fName?: string; // users.fName
  lName?: string; // users.lName
  address1?: string; // users.addLine1
  address2?: string; // users.addLine2
  locality?: string; // users.city
  island?: string; // users.state
  city?: string; // users.city
  state?: string; // users.state
  phone?: string; // May not Used
  magistrate?: boolean; // If record was found in magistrateBookings collection
  supreme?: boolean; // If record was found in hearings collection
  dob?: string; // users.dob in yyyy-mm-dd format
  place_name?: string; // Not Used
  address?: SafeUrl; // Not Used
  photo?: string; // data:image/jpeg;base64 string
  photoURL?: string; // Not Used
  lat?: string; // latitude
  lon?: string; // longitude
  timestamp?: string; // Milliseconds since epoch
  datetime?: string; // Not Used
  distance?: string; // Distance in feet from Police Station
  policestation?: string; // Name of the Police Station with city and island/state
  // Device tracking information for fraud prevention
  deviceUserAgent?: string; // Browser user agent string
  deviceBrowser?: string; // Browser name
  deviceBrowserVersion?: string; // Browser version
  devicePlatform?: string; // Operating system/platform
  deviceLanguage?: string; // Browser language setting
  deviceScreenResolution?: string; // Screen resolution (e.g., "1920x1080")
  deviceTimeZone?: string; // Device timezone
  deviceNetworkInfo?: string; // Network connection information
  deviceTrackingTimestamp?: string; // When device info was collected
}
