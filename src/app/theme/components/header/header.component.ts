import { Component, OnInit, ViewEncapsulation, HostListener } from '@angular/core';
import { AppSettings } from '../../../app.settings';
import { Settings } from '../../../app.settings.model';
import { MenuService } from '../menu/menu.service';
import { AuthService } from "../../../services/auth.service";
import { UpdateService } from 'src/app/services/update-service.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [MenuService],
})
export class HeaderComponent implements OnInit {
  public showHorizontalMenu: boolean = true;
  public showInfoContent: boolean = false;
  public settings: Settings;
  public menuItems: Array<any>;
  ipAddress: string;
  member = localStorage.getItem('member') ? JSON.parse(localStorage.getItem('member')) : null;
  updateAvailable: boolean = false;

  constructor(
    private authService: AuthService,
    private updateService: UpdateService,
    public appSettings: AppSettings,
    public menuService: MenuService
  ) {
    this.settings = this.appSettings.settings;
    this.menuItems = this.menuService.getHorizontalMenuItems();
  }

  ngOnInit() {
    if (window.innerWidth <= 768) this.showHorizontalMenu = false;
    this.ipAddress = this.member?.ipAddress;

    // Subscribe to update availability
    this.updateService.updateAvailable$.subscribe((available) => {
      this.updateAvailable = available;
    });
  }


  reloadPage() {
    window.location.reload();
  }

  @HostListener('window:resize')
  public onWindowResize(): void {
    this.showHorizontalMenu = window.innerWidth > 768;
  }

  public logout() {
    this.authService.logout();
  }
}
