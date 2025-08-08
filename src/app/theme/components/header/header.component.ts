import { Component, OnInit, ViewEncapsulation, HostListener, OnDestroy } from '@angular/core';
import { AppSettings } from '../../../app.settings';
import { Settings } from '../../../app.settings.model';
import { MenuService } from '../menu/menu.service';
import { AuthService } from "../../../services/auth.service";
import { UpdateService } from 'src/app/services/update-service.service';
import { UiStateService } from '../../../services/ui-state.service';
import { EmailNotificationService } from '../../../services/email-notification.service';
import { SpeechSynthesisService } from '../../../services/speech-synthesis.service';
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
  private previousUnreadCount: number = 0;
  private subscriptions: Subscription[] = [];

  // Speech synthesis properties
  speechEnabled: boolean = true;

  constructor(
    private authService: AuthService,
    private updateService: UpdateService,
    public appSettings: AppSettings,
    public menuService: MenuService,
    private uiStateService: UiStateService,
    private emailNotificationService: EmailNotificationService,
    private speechService: SpeechSynthesisService,
    private router: Router
  ) {
    this.settings = this.appSettings.settings;
    this.menuItems = this.menuService.getHorizontalMenuItems();
  }

  ngOnInit() {
    if (window.innerWidth <= 768) this.showHorizontalMenu = false;
    this.ipAddress = this.member?.ipAddress;

    // Initialize speech enabled state
    this.speechEnabled = this.speechService.isSpeechEnabled();

    // Subscribe to update availability
    this.subscriptions.push(
      this.updateService.updateAvailable$.subscribe((available) => {
        this.updateAvailable = available;
      })
    );

    // Subscribe to unread email count
    this.subscriptions.push(
      this.emailNotificationService.unreadCount$.subscribe(count => {
        // First update the current count
        this.unreadEmailCount = count;

        // Check if this is a new message (count increased)
        if (count > this.previousUnreadCount && this.previousUnreadCount !== 0) {
          this.announceNewMessage();
        }

        // Then update the previous count with the current value
        this.previousUnreadCount = count;
      })
    );

    // Refresh unread count on init
    this.emailNotificationService.refreshUnreadCount();

    // Play welcome greeting if not already played today
    setTimeout(() => this.playWelcomeGreeting(), 1500);
  }

  /**
   * Toggle speech enabled state
   */
  toggleSpeech(): void {
    this.speechEnabled = this.speechService.toggleSpeechEnabled();
  }

  ngOnDestroy() {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  /**
   * Play welcome greeting to the user
   */
  private playWelcomeGreeting(): void {
    // Check if greeting has already been played today
    if (this.speechService.hasGreetingPlayedToday()) {
      return;
    }

    // Get user's first name
    const firstName = this.member?.fName || 'User';

    // Create greeting message
    let greeting = `${this.speechService.getTimeBasedGreeting()}, ${firstName}.`;

    // Add message about unread emails
    if (this.unreadEmailCount > 0) {
      greeting += ` You have ${this.unreadEmailCount} new ${this.unreadEmailCount === 1 ? 'message' : 'messages'} waiting.`;
    } else {
      greeting += ' You have no messages waiting.';
    }

    greeting += ' There are no other notifications at this time.';

    // Speak the greeting
    this.speechService.speak(greeting);

    // Mark greeting as played for today
    this.speechService.markGreetingAsPlayed();
  }

  /**
   * Announce new message arrival
   */
  private announceNewMessage(): void {
    this.speechService.speak('You have just received a new message.');
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
