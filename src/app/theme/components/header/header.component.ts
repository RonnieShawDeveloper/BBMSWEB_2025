import { Component, OnInit, ViewEncapsulation, HostListener, OnDestroy } from '@angular/core';
import { AppSettings } from '../../../app.settings';
import { Settings } from '../../../app.settings.model';
import { MenuService } from '../menu/menu.service';
import { AuthService } from "../../../services/auth.service";
import { UpdateService } from 'src/app/services/update-service.service';
import { UiStateService } from '../../../services/ui-state.service';
import { EmailNotificationService } from '../../../services/email-notification.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [MenuService],
})
export class HeaderComponent implements OnInit, OnDestroy {
  public showHorizontalMenu: boolean = true;
  public showInfoContent: boolean = false;
  public settings: Settings;
  public menuItems: Array<any>;
  ipAddress: string;
  member = localStorage.getItem('member') ? JSON.parse(localStorage.getItem('member')) : null;
  updateAvailable: boolean = false;

  // Email notification properties
  unreadEmailCount: number = 0;
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private updateService: UpdateService,
    public appSettings: AppSettings,
    public menuService: MenuService,
    private uiStateService: UiStateService,
    private emailNotificationService: EmailNotificationService,
    private router: Router
  ) {
    this.settings = this.appSettings.settings;
    this.menuItems = this.menuService.getHorizontalMenuItems();
  }

  ngOnInit() {
    if (window.innerWidth <= 768) this.showHorizontalMenu = false;
    this.ipAddress = this.member?.ipAddress;

    // Subscribe to update availability
    this.subscriptions.push(
      this.updateService.updateAvailable$.subscribe((available) => {
        this.updateAvailable = available;
      })
    );

    // Subscribe to unread email count
    this.subscriptions.push(
      this.emailNotificationService.unreadCount$.subscribe(count => {
        this.unreadEmailCount = count;
      })
    );

    // Refresh unread count on init
    this.emailNotificationService.refreshUnreadCount();
  }

  ngOnDestroy() {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  /**
   * Navigate to the email component
   */
  goToEmails() {
    this.router.navigate(['/email']);
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

  public zoomIn(): void {
    this.uiStateService.zoomIn();
  }

  public zoomOut(): void {
    this.uiStateService.zoomOut();
  }
}
