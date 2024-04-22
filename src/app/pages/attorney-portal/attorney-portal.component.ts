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

  searchPage = true
  adminPage = false

  // Create Payment Variables

  currentDate:string = '';
  lastName: String = '';
  dob: string = '';
  searchData: Offender[] = [];
  selectedDefendantToAdd: Offender;
  addDefendantSubscription: Subscription;
  addCurrentOffenderSubscription: Subscription;
  currentUser: Members;
  activeClients: Offender[] = [];
  selectedClient: Offender;

  constructor(private db: AngularFirestore) {
    this.currentDate = moment().format("YYYY-MM-DD hh:mm A");
    this.currentUser = JSON.parse(localStorage.getItem('member'));


    // Get all Clients that this attorney represents from users collection where attorneyID is equal to currentUser ID
    this.addCurrentOffenderSubscription = this.db.collection('users', ref => ref.where('attorneyID', '==', this.currentUser.id)).valueChanges().subscribe((data: Offender[]) => {
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
  searchOffenders() {

    // Check that this.lastName and this.dob are not empty and if they are, create a Swal Dialog telling the user to enter a Last Name and Date of Birth
    if (this.lastName === '' || this.dob === '') {
      Swal.fire({
        title: 'Missing Information',
        text: 'Please enter a Last Name and Date of Birth!',
        icon: 'error'
      });
      return;
    }

    // Get this.lastName and uppercase the first letter and lowercase the remaining letters
    this.lastName = this.lastName.charAt(0).toUpperCase() + this.lastName.slice(1).toLowerCase();

    // Get the Defendants from the database where the last name is equal to this.lastName and the date of birth is equal to this.dob
     this.addDefendantSubscription = this.db.collection('users', ref => ref.where('lName', '==', this.lastName).where('dob', '==', this.dob)).valueChanges().subscribe((data: Offender[]) => {
      this.searchData = data;
      // If there are no Defendants with the last name and date of birth, create a Swal Dialog telling the user that there are no Defendants with that last name and date of birth
      if (this.searchData.length === 0) {
        Swal.fire({
          title: 'No Defendants Found',
          text: 'There are no Defendants with that last name and date of birth!',
          icon: 'error'
        });
      }
    });
  }
  doSelectAdd(offender) {
   // Create a Swal dialog asking the user to affirm adding this offender to their list of clients
    Swal.fire({
      title: 'Add Defendant?',
      text: 'Are you sure you want to add this Defendant to your list of clients? The court administrator will be notified!',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'No'
    }).then((result) => {
      if (result.isConfirmed) {
        // If the user clicks yes, add the offender to the users collection where the attorneyID is equal to the current user's ID
        this.db.collection('users').doc(offender.id).update({attorneyID: this.currentUser.id, attorneyName: this.currentUser.fName + ' ' + this.currentUser.lName}).then(() => {
          Swal.fire({
            title: 'Defendant Added!',
            text: 'The Defendant has been added to your list of clients!',
            icon: 'success'
          });
          this.searchData = [];
          this.lastName = '';
          this.dob = '';
        }).catch((error) => {
          Swal.fire({
            title: 'Error!',
            text: 'There was an error adding the Defendant to your list of clients! Please try again later!',
            icon: 'error'
          });
        });

      }
    });
  }

  doSelectClient(client) {
    this.selectedClient = client;
    this.searchPage = false;
    this.adminPage = true;
  }

  ngOnInit(): void {

  }

  closeAdmin() {
    this.searchPage = true;
    this.adminPage = false;
  }

  ngOnDestroy(): void {
    this.addDefendantSubscription.unsubscribe();
    this.addCurrentOffenderSubscription.unsubscribe();
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
