import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {

  // To create a new announcement, change the ID and update the content.
  private readonly currentAnnouncement = {
    id: 4, // Increment this for new announcements
    title: 'NEW MESSAGE SYSTEM ANNOUNCEMENT',
    html: `
      <p>I want to let everyone know that we now have a message system (In-House Email)
      built into the BBMS. Members will be instantly notified that they have a new email
      and will have the option to read it or read it later if they are in the middle of
      a task. Unread emails notification will appear at the top of the page in the header
      above. </p>
      <p>Play around with the features, and all messages are end-to-end encrypted and will
      not be decrypted until they are clicked on to read. If you have any questions or to
      report a bug, please use the message service to send a question to Ronnie Shaw (Development)</p>
    `
  };

  private getStorageKey(): string {
    return `announcement_seen_${this.currentAnnouncement.id}`;
  }

  public shouldShowAnnouncement(): boolean {
    try {
      return !localStorage.getItem(this.getStorageKey());
    } catch (e) {
      console.error('Could not access localStorage for announcements', e);
      return false;
    }
  }

  public markAsSeen(): void {
    try {
      localStorage.setItem(this.getStorageKey(), 'true');
    } catch (e) {
      console.error('Could not save announcement status to localStorage', e);
    }
  }

  public getAnnouncement() {
    return {
      title: this.currentAnnouncement.title,
      html: this.currentAnnouncement.html
    };
  }
}
