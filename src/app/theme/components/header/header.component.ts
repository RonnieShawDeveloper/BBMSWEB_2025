import { Component, OnInit, ViewEncapsulation, HostListener } from '@angular/core';
import { trigger,  state,  style, transition, animate } from '@angular/animations';
import { AppSettings } from '../../../app.settings';
import { Settings } from '../../../app.settings.model';
import { MenuService } from '../menu/menu.service';
import {AuthService} from "../../../services/auth.service";
import Swal from "sweetalert2";
import {Members} from "../../../models/members";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [ MenuService ],
  animations: [
    trigger('showInfo', [
      state('1' , style({ transform: 'rotate(180deg)' })),
      state('0', style({ transform: 'rotate(0deg)' })),
      transition('1 => 0', animate('400ms')),
      transition('0 => 1', animate('400ms'))
    ])
  ]
})
export class HeaderComponent implements OnInit {
  public showHorizontalMenu:boolean = true;
  public showInfoContent:boolean = false;
  public settings: Settings;
  public menuItems:Array<any>;
  member: Members = localStorage.getItem('member') ? JSON.parse(localStorage.getItem('member')) : null;


  constructor(private authService: AuthService, public appSettings:AppSettings, public menuService:MenuService) {
      this.settings = this.appSettings.settings;
      this.menuItems = this.menuService.getHorizontalMenuItems();
  }

  ngOnInit() {
    if(window.innerWidth <= 768)
      this.showHorizontalMenu = false;
  }
  doCheckForUpdates() {
    Swal.fire({
      icon: 'info',
      title: 'Check for Updates',
      text: 'We will check and load any updates that are available. The browser window may refresh. Any unsaved work will be lost. Do you want to continue?',
      confirmButtonText: 'Yes',
      showCancelButton: true,
      cancelButtonText: 'No',
      reverseButtons: true
    }).then((result) => {
      if(result.isConfirmed) {
        // Call the update function from the AuthService
        window.location.reload();
      }
    });
  }

  public closeSubMenus(){
    let menu = document.querySelector("#menu0");
    if(menu){
      for (let i = 0; i < menu.children.length; i++) {
          let child = menu.children[i].children[1];
          if(child){
              if(child.classList.contains('show')){
                child.classList.remove('show');
                menu.children[i].children[0].classList.add('collapsed');
              }
          }
      }
    }
  }

  @HostListener('window:resize')
  public onWindowResize():void {
     if(window.innerWidth <= 768){
        this.showHorizontalMenu = false;
     }
      else{
        this.showHorizontalMenu = true;
      }
  }

  // Create a Logout function
  public logout() {
    // Call the logout function from the AuthService
    this.authService.logout();
  }


}
