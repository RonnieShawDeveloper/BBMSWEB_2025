import {Component, EventEmitter, Output} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {Members} from "../../../models/members";
import {NgIf} from "@angular/common";
import Swal from "sweetalert2";

@Component({
  selector: 'app-get-payment-page',
  standalone: true,
  imports: [
    FormsModule,
    NgIf
  ],
  templateUrl: './get-payment-page.component.html',
  styleUrl: './get-payment-page.component.scss'
})
export class GetPaymentPageComponent {

  @Output() closePage: EventEmitter<boolean> = new EventEmitter<boolean>();

  credit_card_number: string = '';
  cardType: string = '';
  formatedcardnumber: string = '';
  expiration_date: string = '';
  cvc_code: string = '';
  zip_code: string = '';
  member: Members;

  constructor() {
    // Get the current member from the local storage
    this.member = JSON.parse(localStorage.getItem('member'));
  }

  doNumberKeyup() {
    // get the credit_card_number value and remove all non digit characters
    this.formatedcardnumber = this.credit_card_number.replace(/\D/g, '');
    // Insert a space after every 4 characters
    this.formatedcardnumber = this.formatedcardnumber.replace(/(\d{4})/g, '$1 ').trim();

  }

  check_expiration_date() {
    // get the expiration_date value and remove all non digit characters
    this.expiration_date = this.expiration_date.replace(/\D/g, '');
    // Insert a slash after the first 2 characters
    this.expiration_date = this.expiration_date.replace(/(\d{2})/, '$1/').trim();
    // If the expiration_date is longer than 5 characters, make the exp_date input box red
    if (this.expiration_date.length != 5) {
      document.getElementById('exp_date').style.backgroundColor = '#FFCCCB';
    } else {
      document.getElementById('exp_date').style.backgroundColor = 'lightgreen';
    }
  }

  check_cvc_code() {
    // get the cvc_code value and remove all non digit characters
    this.cvc_code = this.cvc_code.replace(/\D/g, '');
  }

  check_zip_code() {
    // get the zip_code value and remove all non digit characters
    this.zip_code = this.zip_code.replace(/\D/g, '');
  }

  getCardType() {
    // Remove all spaces from the credit_card_number
    this.credit_card_number = this.credit_card_number.replace(/\s/g, '');
    console.log('Credit Card: ', this.credit_card_number)
    // Define regular expressions for each card type
    let cardRegex = {
      'Visa': /^4[0-9]{12}(?:[0-9]{3})?$/,
      'Mastercard': /^5[1-5][0-9]{14}$/,
      'Discover': /^6(?:011|5[0-9]{2})[0-9]{12}$/,
      'Amex': /^3[47][0-9]{13}$/,
    };
    this.cardType = 'Unknown';
    // Check the card type using the regular expressions
    for (let card in cardRegex) {
      if (cardRegex[card].test(this.credit_card_number)) {
        this.cardType = card;
      }
    }

  }

  doSubmitPayment() {
    // Create a Swal Dialog letting the member know the application is being submitted and payment is being processed and to please wait
    Swal.fire({
      title: 'Processing Payment',
      text: 'Please wait...',
      icon: 'info',
      allowOutsideClick: false,
      showConfirmButton: false
    });
    // Create a timeout to simulate the payment processing
    setTimeout(() => {
      // Close the Swal Dialog
      Swal.close();
      // Create a Swal Dialog letting the member know the payment was successful
      Swal.fire({
        title: 'Payment Successful',
        text: 'Thank you for your payment!',
        icon: 'success',
        allowOutsideClick: false,
        showConfirmButton: true
      }).then((result) => {
        this.closePage.emit(true);
      });
    }, 3000);
  }

  doCancel() {
    this.closePage.emit(false);
  }

}
