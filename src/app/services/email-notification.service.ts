import { Injectable } from '@angular/core';
import { MailboxService } from './mailbox.service';
import { BehaviorSubject, Observable, filter, map, tap } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class EmailNotificationService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  private lastCheckedTimestamp: Date = new Date();
  private currentUserId: string = null;

  constructor(
    private mailboxService: MailboxService,
    private router: Router
  ) {
    // Initialize the service
    this.initialize();
  }

  /**
   * Initialize the email notification service
   * Sets up real-time monitoring of unread emails
   */
  private initialize(): void {
    // Get current user ID from localStorage
    const memberData = localStorage.getItem('member');
    if (memberData) {
      try {
        const member = JSON.parse(memberData);
        if (member && member.id) {
          this.currentUserId = member.id;
          console.log('Email notification service initialized for user:', this.currentUserId);

          // Start monitoring unread emails
          this.monitorUnreadEmails();
        }
      } catch (error) {
        console.error('Error parsing member data:', error);
      }
    }
  }

  /**
   * Monitor unread emails in real-time
   * Updates the unread count and shows notifications for new emails
   */
  private monitorUnreadEmails(): void {
    // Use the mailbox service to get all emails for the current user
    this.mailboxService.getAllMails().pipe(
      // Filter out emails that are already read
      map(emails => emails.filter(email => email.unread)),
      // Tap into the stream to handle notifications for new emails
      tap(unreadEmails => {
        // Update the unread count
        this.unreadCountSubject.next(unreadEmails.length);

        // Check for new emails (received after lastCheckedTimestamp)
        const newEmails = unreadEmails.filter(email => {
          const emailDate = new Date(email.date);
          return emailDate > this.lastCheckedTimestamp;
        });

        // If there are new emails, show a notification
        if (newEmails.length > 0) {
          this.showNewEmailNotification(newEmails);

          // Update the last checked timestamp
          this.lastCheckedTimestamp = new Date();
        }
      })
    ).subscribe();
  }

  /**
   * Show a SweetAlert notification for new emails
   * @param newEmails Array of new unread emails
   */
  private showNewEmailNotification(newEmails: any[]): void {
    // Get unique sender names
    const senderNames = [...new Set(newEmails.map(email => email.sender))];

    // Create the notification message
    let message = `You have ${newEmails.length} new message${newEmails.length > 1 ? 's' : ''} from `;

    if (senderNames.length === 1) {
      message += senderNames[0];
    } else if (senderNames.length === 2) {
      message += `${senderNames[0]} and ${senderNames[1]}`;
    } else {
      const lastSender = senderNames.pop();
      message += `${senderNames.join(', ')}, and ${lastSender}`;
    }

    // Show the SweetAlert notification
    Swal.fire({
      icon: 'info',
      title: 'New Messages',
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Go To Messages',
      cancelButtonText: 'OK'
    }).then((result) => {
      if (result.isConfirmed) {
        // Navigate to the email component
        this.router.navigate(['/email']);
      }
    });
  }

  /**
   * Get the current unread email count
   * @returns The current unread email count
   */
  public getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * Manually refresh the unread email count
   * Useful when the component is initialized
   */
  public refreshUnreadCount(): void {
    this.mailboxService.getAllMails().pipe(
      map(emails => emails.filter(email => email.unread).length),
      tap(count => this.unreadCountSubject.next(count))
    ).subscribe();
  }
}
