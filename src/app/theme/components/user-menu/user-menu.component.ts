import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {Members} from "../../../models/members";
import Swal from "sweetalert2";

@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.component.html',
  styleUrls: ['./user-menu.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class UserMenuComponent implements OnInit {
  member: Members = JSON.parse(localStorage.getItem('member'));
  constructor() { }

  ngOnInit() {
  }

  doTakePicture() {
    Swal.fire({
      title: 'Coming Soon!',
      text: 'This feature will be available soon.',
      icon: 'info',
      confirmButtonText: 'Ok'
    });
  }

}
