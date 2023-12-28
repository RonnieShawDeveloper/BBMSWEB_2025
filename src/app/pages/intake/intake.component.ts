import {Component, OnInit} from '@angular/core';
import {Defendants} from "../../models/defendants";

@Component({
  selector: 'app-intake',
  templateUrl: './intake.component.html',
  styleUrls: ['./intake.component.scss']
})
export class IntakeComponent implements OnInit{

  page_one = true; // Initial Search
  page_two = false; // Pull up defendant history and update record
  page_three = false;
  newDefendant = false; // Create a new defendant
  selectedDefendant: Defendants = {} as Defendants; // The defendant selected from the list
  constructor() { }

    ngOnInit() {
    }

  doNewDefendant(event: boolean) {
    this.page_one = false;
    this.page_two = false;
    this.newDefendant = true;
  }

  doSelectedDefendant(defendant: Defendants) {
    this.selectedDefendant = defendant;
    this.page_one = false;
    this.page_two = true;
  }

  closePageTwo($event) {
    this.page_one = true;
    this.page_two = false;
    this.newDefendant = false;
    this.selectedDefendant = {} as Defendants;
  }
  closeAddDefendant($event) {
    this.page_one = true;
    this.page_two = false;
    this.newDefendant = false;
    this.selectedDefendant = {} as Defendants;
  }
}
