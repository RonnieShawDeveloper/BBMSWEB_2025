import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {AngularFirestore} from "@angular/fire/compat/firestore";
import {Observable, Subscription, take} from "rxjs";
import * as moment from 'moment';
import Swal from 'sweetalert2';
import {Offender} from "../../models/offender";
import {Members} from "../../models/members";

@Component({
  selector: 'app-attorney-portal',
  templateUrl: './attorney-portal.component.html',
  styleUrls: ['./attorney-portal.component.scss']
})
export class AttorneyPortalComponent implements OnDestroy, OnInit {

  // Create Payment Variables

  currentDate:string = '';
  lastName: String = '';
  dob: string = '';
  selectedDefendantToAdd: Offender;
  addDefendantSubscription: Subscription;
  currentUser: Members;
  activeClients: Offender[] = [];

  constructor(private db: AngularFirestore) {
    this.currentDate = moment().format("YYYY-MM-DD hh:mm A");
    this.currentUser = JSON.parse(localStorage.getItem('member'));
    console.log('currentUser:',this.currentUser)

    // Get all Clients that this attorney represents from users collection where attorneyID is equal to currentUser ID
      this.db.collection('users', ref => ref.where('attorneyID', '==', this.currentUser.id)).valueChanges().subscribe((data: Offender[]) => {
        this.activeClients = data;
        console.log('active:', this.activeClients);
      });
  }

  getCurrentDateTime(): string {
    return moment().format('YYYY-MM-DD hh:mm A');
  }

  /**
   * Retrieves a defendant from the database based on last name.
   *
   * @returns {void}
   */
  getDefendant() {

    // Get this.lastName and uppercase the first letter and lowercase the remaining letters
    this.lastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();

    console.log('DOB:', this.dob);
    // Check this.dob to see if its a valid date in the format of 'yyyy-mm-dd' and if not, create a Swal Dialog telling the user to enter a valid Date of Birth
    if (!moment(this.dob, 'YYYY-MM-DD', true).isValid()) {
      Swal.fire({
        title: 'Invalid Date of Birth',
        text: 'Please enter a valid Date of Birth!',
        icon: 'error'
      });
      return;
    }

    this.addDefendantSubscription = this.db.collection('users', ref => ref.where('lName', '==', this.lastName)).valueChanges().pipe(take(1)).subscribe((data: Offender[]) => {

      if (data.length > 1) {
        const inputOptions = {};
        data.forEach((defendant, index) => {
          inputOptions[index] = `${defendant.fName} ${defendant.mName} ${defendant.lName}`
        });

        Swal.fire({
          title: 'Multiple Defendants Found',
          text: 'Multiple Defendants where found with that Last name and Date of Birth. Please select your Client:',
          input: 'select',
          inputOptions: inputOptions,
          showCancelButton: true
        }).then(result => {
          if (result.isConfirmed) {
            this.selectedDefendantToAdd = data[result.value];
            this.selectedDefendantToAdd.attorneyID = this.currentUser.id;
            this.selectedDefendantToAdd.attorneyName = this.currentUser.name;
            this.selectedDefendantToAdd.attorneyAdded = this.getCurrentDateTime();
            console.log('Defendant: ', this.selectedDefendantToAdd);
            this.attorneyAddedDialog(this.selectedDefendantToAdd);
          }
        });
      } else if (data.length === 1) {
        this.selectedDefendantToAdd = data[0];
        this.selectedDefendantToAdd.attorneyID = this.currentUser.id;
        this.selectedDefendantToAdd.attorneyName = this.currentUser.name;
        this.selectedDefendantToAdd.attorneyAdded = this.getCurrentDateTime();
        console.log('Defendant: ', this.selectedDefendantToAdd);
        this.attorneyAddedDialog(this.selectedDefendantToAdd);
      } else {
        Swal.fire({
          title: 'No records found',
          text: 'No records were found with that last name and date of birth',
          icon: 'error'
        });
        return;
      }
    })

  }

  attorneyAddedDialog(def: Offender) {
    // Create a Swal Dialog letting the user know that the Defendant was added as a Client and the courts have been notified. Include the Defendants name and Date of Birth
    Swal.fire({
      title: 'Defendant Added',
      text: `Defendant ${def.fName} ${def.lName} with Date of Birth ${def.dob} has been added as a Client and the courts have been notified.`,
      icon: 'success'
    }).then(result => {
      this.selectedDefendantToAdd = {};
      this.lastName = '';
      this.dob = '';
      return;
    });
  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {

  }

  /**
   * Function to initiate payment process.
   * It creates a payment URL with various payment parameters
   * and opens the payment gateway page in a new browser tab.
   */
  makePayment() {
    console.log('Redirecting');
    const query = new URLSearchParams();

    query.set('firstName', 'Ronnie');
    query.set('lastName', 'Shaw');
    query.set('email', 'testemail@testemail.com');
    query.set('totalAmount', '100.00');
    query.set('transactionMode', 'icms');
    query.set('itemId', '100');
    query.set('refId', 'ABC123');
    query.set('successUrl', 'https://bbmsweb.com/success');
    query.set('failureUrl', 'https://bbmsweb.com/failure');

    const url = 'https://payment-qa.revenue.gov.bs/boomerang?' + query.toString();
    console.log('URL:', url);
    window.open(url, '_blank');
  }
}
