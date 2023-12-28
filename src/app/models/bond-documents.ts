import {SafeUrl} from '@angular/platform-browser';

export interface BondDocuments {
  id?: string;
  name?: string;
  unixDate?: string;
  file?: SafeUrl;
}
