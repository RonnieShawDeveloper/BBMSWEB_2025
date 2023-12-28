import {SafeUrl} from "@angular/platform-browser";

export interface Phonecheckin {
    id?: string;
    BBMSID?: string;
    AFISID?: string;
    fName?: string;
    lName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    phone?: string;
    magistrate?: boolean;
    supreme?: boolean;
    dob?: string;
    place_name?: string;
    address?: SafeUrl;
    photo?: string;
    lat?: string;
    lon?: string;
    timestamp?: string;
    datetime?: string;
    distance?: string;
    policestation?: string;
}
