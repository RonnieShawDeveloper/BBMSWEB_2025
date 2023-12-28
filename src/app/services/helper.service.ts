import { Injectable } from '@angular/core';
import { crimeCodes } from "../models/data";

@Injectable({
  providedIn: 'root'
})
export class HelperService {


  constructor() { }

  getCrimes():{code: string, value: string}[] {
    // take the crimeCodes and split them on the '-' character and create a new array using the first element as the key and the second as the value
    // this will be used to populate the crime dropdown
    const crimeCodeArray = [];
    for (let i = 0; i < crimeCodes.length; i++) {
      const crimeCode = crimeCodes[i].split('-');
      crimeCodeArray.push({code: crimeCode[0], value: crimeCode[1]});
    }
    // sort the array by the value
    crimeCodeArray.sort((a, b) => (a.value > b.value) ? 1 : -1);

    return crimeCodeArray;
  }

}
