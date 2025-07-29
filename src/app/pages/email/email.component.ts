import { NgClass, DatePipe, AsyncPipe } from '@angular/common';
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Mail, MailboxService } from '../../services/mailbox.service';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { MailSearchPipe } from '../../theme/pipes/search/mail-search.pipe';
import { Observable, Subscription, debounceTime, distinctUntilChanged, of, startWith, switchMap } from 'rxjs';
import { Members } from '../../models/members';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import Quill from 'quill';

@Component({
  selector: 'app-email',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    NgScrollbarModule,
    NgClass,
    DatePipe,
    MailSearchPipe,
    AsyncPipe,
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  templateUrl: './email.component.html',
  standalone: true,
  styleUrls: ['./email.component.scss']
})
export class EmailComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('quillEditor') quillEditorElement: ElementRef;
  @ViewChild('quillViewer') quillViewerElement: ElementRef;

  public mails: Mail[] = [];
  public mail: Mail | null = null;
  public newMail: boolean = false;
  public replyMail: boolean = false;
  public replyAllMail: boolean = false;
  public type: string = 'inbox';
  public searchText: string = '';

  // Form controls for new email
  public subject: string = '';
  public body: string = '';
  public recipientControl = new FormControl('');
  public selectedRecipients: Members[] = [];
  public filteredMembers: Observable<Members[]> = of([]);

  // Original email for reply
  private originalEmail: Mail | null = null;

  // Encryption/decryption state
  public showEncrypted: boolean = false;
  public decrypting: boolean = false;
  public encryptedContent: string = '';
  public decryptedContent: string = '';

  // Quill editor properties
  private quillEditor: Quill;
  private quillViewer: Quill;
  private quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['clean']
    ]
  };

  // Subscription management
  private subscriptions: Subscription[] = [];

  constructor(
    private mailboxService: MailboxService,
    private firestore: AngularFirestore
  ) { }

  ngOnInit() {
    this.getMails();
    this.setupRecipientAutocomplete();

    // Direct Firestore query to check if emails can be fetched
    console.log('Attempting direct Firestore query for emails');

    // Query for all emails in the collection (no filters)
    this.firestore.collection('emails').get().subscribe(snapshot => {
      console.log('Direct query for ALL emails returned', snapshot.docs.length, 'emails');
      if (snapshot.docs.length > 0) {
        console.log('Sample of emails in collection:');
        snapshot.docs.slice(0, 3).forEach((doc, index) => {
          const email = doc.data();
          console.log(`Email ${index + 1}:`, {
            id: doc.id,
            subject: email['subject'],
            sender: email['sender'],
            senderId: email['senderId'],
            recipients: email['recipients'],
            date: email['date'],
            sent: email['sent'],
            trash: email['trash']
          });
        });
      } else {
        console.error('No emails found in the collection at all!');
      }
    });

    // Get current user ID from localStorage
    const memberData = localStorage.getItem('member');
    if (memberData) {
      const member = JSON.parse(memberData);
      const currentUserId = member.id;
      console.log('Direct query: currentUserId from localStorage:', currentUserId);

      // Query for inbox emails (where user is a recipient)
      this.firestore.collection('emails', ref =>
        ref.where('recipients', 'array-contains', currentUserId)
           .where('trash', '==', false)
           .orderBy('date', 'desc')
      ).get().subscribe(snapshot => {
        console.log('Direct query for inbox returned', snapshot.docs.length, 'emails');
        if (snapshot.docs.length > 0) {
          console.log('First inbox email:', snapshot.docs[0].data());
        }
      });

      // Query for sent emails
      this.firestore.collection('emails', ref =>
        ref.where('senderId', '==', currentUserId)
           .where('sent', '==', true)
           .where('trash', '==', false)
           .orderBy('date', 'desc')
      ).get().subscribe(snapshot => {
        console.log('Direct query for sent emails returned', snapshot.docs.length, 'emails');
        if (snapshot.docs.length > 0) {
          console.log('First sent email:', snapshot.docs[0].data());
        }
      });
    } else {
      console.error('Direct query: No member data found in localStorage');
    }
  }

  /**
   * Initialize the Quill editor after the view is initialized
   */
  ngAfterViewInit() {
    // Initialize Quill when the view is ready and the editor is visible
    this.initializeQuillEditor();
  }

  /**
   * Initialize the Quill editor
   */
  private initializeQuillEditor() {
    // Only initialize if we're in compose or reply mode and the element exists
    if ((this.newMail || this.replyMail || this.replyAllMail) && this.quillEditorElement) {
      // Create a new Quill editor instance
      this.quillEditor = new Quill(this.quillEditorElement.nativeElement, {
        modules: this.quillModules,
        theme: 'snow',
        placeholder: 'Compose your message...'
      });

      // Set initial content if there's any
      if (this.body) {
        this.quillEditor.clipboard.dangerouslyPasteHTML(this.body);
      }

      // Listen for text changes
      this.quillEditor.on('text-change', () => {
        // Update the body property with the HTML content
        this.body = this.getQuillContent();
      });
    }
  }

  /**
   * Get the HTML content from the Quill editor
   */
  private getQuillContent(): string {
    if (this.quillEditor) {
      return this.quillEditor.root.innerHTML;
    }
    return '';
  }

  /**
   * Set the content of the Quill editor
   */
  private setQuillContent(content: string) {
    if (this.quillEditor) {
      this.quillEditor.clipboard.dangerouslyPasteHTML(content);
    }
  }

  /**
   * Initialize the Quill viewer for displaying emails
   * @param content The HTML content to display
   */
  private initializeQuillViewer(content: string) {
    // Clean up any existing viewer
    this.cleanupQuillViewer();

    // Only initialize if the element exists
    if (this.quillViewerElement) {
      // Create a new Quill instance in read-only mode without toolbar
      this.quillViewer = new Quill(this.quillViewerElement.nativeElement, {
        modules: {
          toolbar: false // No toolbar for viewer
        },
        theme: 'snow',
        readOnly: true // Read-only mode
      });

      // Set the content
      if (content) {
        this.quillViewer.clipboard.dangerouslyPasteHTML(content);
      }
    }
  }

  /**
   * Clean up the Quill viewer instance
   */
  private cleanupQuillViewer() {
    if (this.quillViewer) {
      // Clear the editor content
      this.quillViewer.setText('');

      // Remove the editor instance to prevent memory leaks
      this.quillViewer = null;
    }
  }

  private setupRecipientAutocomplete() {
    this.filteredMembers = this.recipientControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        if (typeof value === 'string' && value.length >= 3) {
          return this.mailboxService.searchMembers(value);
        }
        return of([]);
      })
    );
  }

  public getMails() {
    console.log('EmailComponent.getMails() called with type:', this.type);

    // Clear any existing mail subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    let subscription: Subscription;

    switch (this.type) {
      case 'inbox':
        subscription = this.mailboxService.getAllMails().subscribe(mails => {
          console.log('EmailComponent received', mails.length, 'emails for inbox');
          this.mails = mails;
        });
        break;
      case 'starred':
        subscription = this.mailboxService.getStarredMails().subscribe(mails => {
          console.log('EmailComponent received', mails.length, 'starred emails');
          this.mails = mails;
        });
        break;
      case 'sent':
        subscription = this.mailboxService.getSentMails().subscribe(mails => {
          console.log('EmailComponent received', mails.length, 'sent emails');
          this.mails = mails;
        });
        break;
      case 'drafts':
        subscription = this.mailboxService.getDraftMails().subscribe(mails => {
          console.log('EmailComponent received', mails.length, 'draft emails');
          this.mails = mails;
        });
        break;
      case 'trash':
        subscription = this.mailboxService.getTrashMails().subscribe(mails => {
          console.log('EmailComponent received', mails.length, 'trash emails');
          this.mails = mails;
        });
        break;
      default:
        subscription = this.mailboxService.getAllMails().subscribe(mails => {
          console.log('EmailComponent received', mails.length, 'emails (default case - inbox)');
          this.mails = mails;
        });
    }

    // Store the subscription for cleanup
    this.subscriptions.push(subscription);
  }

  /**
   * Cleanup subscriptions and Quill instances when component is destroyed
   */
  ngOnDestroy() {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(subscription => subscription.unsubscribe());

    // Clean up Quill instances
    this.cleanupQuillViewer();

    // Clean up the Quill editor
    if (this.quillEditor) {
      this.quillEditor.setText('');
      this.quillEditor = null;
    }
  }

  public viewDetail(mail: Mail) {
    // Clean up any existing Quill viewer
    this.cleanupQuillViewer();

    this.mailboxService.getMail(mail.id).subscribe(mailDetail => {
      if (mailDetail) {
        this.mail = mailDetail;
        this.mails.forEach(m => m.selected = false);
        this.mail.selected = true;
        this.newMail = false;
        this.replyMail = false;
        this.replyAllMail = false;

        // If the message has an encrypted body, show the decryption process
        if (this.mail.encryptedBody) {
          this.showEncrypted = true;
          this.encryptedContent = this.mail.encryptedBody;
          this.decryptedContent = '';

          // After 1 second, show the decryption animation
          setTimeout(() => {
            this.decrypting = true;
            this.showEncrypted = false;

            // After another 1 second, show the decrypted message
            setTimeout(() => {
              this.decrypting = false;
              this.decryptedContent = this.mail.body;

              // Initialize the Quill viewer with the decrypted content
              setTimeout(() => {
                this.initializeQuillViewer(this.mail.body);
              }, 0);
            }, 1000);
          }, 1000);
        } else {
          // No encryption, initialize the Quill viewer directly
          setTimeout(() => {
            this.initializeQuillViewer(this.mail.body);
          }, 0);
        }
      }
    });
  }

  public compose() {
    // Clean up any existing Quill viewer
    this.cleanupQuillViewer();

    this.mail = null;
    this.newMail = true;
    this.replyMail = false;
    this.replyAllMail = false;
    this.subject = '';
    this.body = '';
    this.selectedRecipients = [];
    this.recipientControl.setValue('');

    // Initialize Quill editor after a short delay to ensure the DOM is updated
    setTimeout(() => {
      this.initializeQuillEditor();
    }, 0);
  }

  public reply() {
    if (this.mail) {
      // Clean up any existing Quill viewer
      this.cleanupQuillViewer();

      this.originalEmail = this.mail;
      this.replyMail = true;
      this.replyAllMail = false;
      this.newMail = false;
      this.subject = `Re: ${this.mail.subject}`;
      this.body = '';

      // Add original sender as recipient
      this.mailboxService.searchMembers(this.mail.sender).subscribe(members => {
        if (members.length > 0) {
          this.selectedRecipients = [members[0]];
        }
      });

      // Initialize Quill editor after a short delay to ensure the DOM is updated
      setTimeout(() => {
        this.initializeQuillEditor();

        // Add a quote of the original message
        if (this.quillEditor && this.mail) {
          const originalSender = this.mail.sender;
          const originalDate = new Date(this.mail.date).toLocaleString();
          const originalBody = this.mail.body;

          const quoteHtml = `
            <p></p>
            <p>On ${originalDate}, ${originalSender} wrote:</p>
            <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px; color: #777;">
              ${originalBody}
            </blockquote>
            <p></p>
          `;

          this.quillEditor.clipboard.dangerouslyPasteHTML(quoteHtml);
          this.quillEditor.setSelection(0, 0); // Move cursor to the beginning
        }
      }, 0);
    }
  }

  public replyAll() {
    if (this.mail) {
      // Clean up any existing Quill viewer
      this.cleanupQuillViewer();

      this.originalEmail = this.mail;
      this.replyMail = false;
      this.replyAllMail = true;
      this.newMail = false;
      this.subject = `Re: ${this.mail.subject}`;
      this.body = '';

      // Get all recipients and sender
      this.mailboxService.getAllMembers().subscribe(allMembers => {
        // Add original sender
        const senderMember = allMembers.find(m =>
          `${m.fName} ${m.lName}`.trim() === this.mail?.sender);

        // Add all original recipients
        this.selectedRecipients = allMembers.filter(member =>
          this.mail?.recipients.includes(member.id) ||
          (senderMember && member.id === senderMember.id)
        );

        // Remove current user from recipients
        const memberData = localStorage.getItem('member');
        if (memberData) {
          const currentUser = JSON.parse(memberData);
          this.selectedRecipients = this.selectedRecipients.filter(r => r.id !== currentUser.id);
        }
      });

      // Initialize Quill editor after a short delay to ensure the DOM is updated
      setTimeout(() => {
        this.initializeQuillEditor();

        // Add a quote of the original message
        if (this.quillEditor && this.mail) {
          const originalSender = this.mail.sender;
          const originalDate = new Date(this.mail.date).toLocaleString();
          const originalBody = this.mail.body;

          const quoteHtml = `
            <p></p>
            <p>On ${originalDate}, ${originalSender} wrote:</p>
            <blockquote style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px; color: #777;">
              ${originalBody}
            </blockquote>
            <p></p>
          `;

          this.quillEditor.clipboard.dangerouslyPasteHTML(quoteHtml);
          this.quillEditor.setSelection(0, 0); // Move cursor to the beginning
        }
      }, 0);
    }
  }

  public setAsRead() {
    if (this.mail) {
      this.mailboxService.markAsRead(this.mail.id);
    }
  }

  public setAsUnRead() {
    if (this.mail) {
      this.mailboxService.markAsUnread(this.mail.id);
    }
  }

  public delete() {
    if (this.mail) {
      this.mailboxService.moveToTrash(this.mail.id).then(() => {
        this.getMails();
        this.mail = null;
      });
    }
  }

  public changeStarStatus() {
    if (this.mail) {
      this.mailboxService.toggleStarStatus(this.mail.id).then(() => {
        this.mail.starred = !this.mail.starred;
        this.getMails();
      });
    }
  }

  public restore() {
    if (this.mail) {
      this.mailboxService.restoreFromTrash(this.mail.id).then(() => {
        this.type = 'all';
        this.getMails();
        this.mail = null;
      });
    }
  }

  public addRecipient(member: Members) {
    if (!this.selectedRecipients.some(r => r.id === member.id)) {
      this.selectedRecipients.push(member);
    }
    this.recipientControl.setValue('');
  }

  public removeRecipient(member: Members) {
    this.selectedRecipients = this.selectedRecipients.filter(r => r.id !== member.id);
  }

  public displayMember(member: Members): string {
    return member ? `${member.fName} ${member.lName}` : '';
  }

  public sendEmail() {
    if (this.selectedRecipients.length === 0) {
      alert('Please select at least one recipient');
      return;
    }

    const recipientIds = this.selectedRecipients.map(r => r.id);

    if (this.replyMail && this.originalEmail) {
      this.mailboxService.replyToEmail(this.originalEmail.id, this.body)
        .then(() => {
          this.resetForm();
          this.type = 'sent';
          this.getMails();
        })
        .catch(error => {
          console.error('Error sending reply:', error);
          alert('Failed to send reply. Please try again.');
        });
    } else if (this.replyAllMail && this.originalEmail) {
      this.mailboxService.replyToAllEmail(this.originalEmail.id, this.body)
        .then(() => {
          this.resetForm();
          this.type = 'sent';
          this.getMails();
        })
        .catch(error => {
          console.error('Error sending reply to all:', error);
          alert('Failed to send reply to all. Please try again.');
        });
    } else {
      this.mailboxService.sendEmail(this.subject, this.body, recipientIds)
        .then(() => {
          this.resetForm();
          this.type = 'sent';
          this.getMails();
        })
        .catch(error => {
          console.error('Error sending email:', error);
          alert('Failed to send email. Please try again.');
        });
    }
  }

  public saveDraft() {
    const recipientIds = this.selectedRecipients.map(r => r.id);
    this.mailboxService.saveDraft(this.subject, this.body, recipientIds)
      .then(() => {
        this.resetForm();
        this.type = 'drafts';
        this.getMails();
      })
      .catch(error => {
        console.error('Error saving draft:', error);
        alert('Failed to save draft. Please try again.');
      });
  }

  public resetForm() {
    this.newMail = false;
    this.replyMail = false;
    this.replyAllMail = false;
    this.subject = '';
    this.body = '';
    this.selectedRecipients = [];
    this.recipientControl.setValue('');
    this.originalEmail = null;

    // Clean up the Quill editor
    if (this.quillEditor) {
      // Clear the editor content
      this.quillEditor.setText('');

      // Remove the editor instance to prevent memory leaks
      this.quillEditor = null;
    }

    // Clean up the Quill viewer
    this.cleanupQuillViewer();
  }

  /**
   * Returns the appropriate display name for sent emails
   * For sent emails, we want to show the recipient names instead of the sender name
   */
  public getDisplayNameForSentMail(mail: Mail): string {
    if (mail.recipientNames && mail.recipientNames.length > 0) {
      // If there's only one recipient, show their name
      if (mail.recipientNames.length === 1) {
        return mail.recipientNames[0];
      }
      // If there are multiple recipients, show the first one and indicate how many more
      return `${mail.recipientNames[0]} +${mail.recipientNames.length - 1}`;
    }
    return 'No recipients';
  }

  /**
   * Checks if a recipient has read the email
   * @param mail The email to check
   * @param recipientIndex The index of the recipient in the recipientNames array
   * @returns True if the recipient has read the email, false otherwise
   */
  public isRecipientRead(mail: Mail, recipientIndex: number): boolean {
    if (!mail || !mail.recipients || recipientIndex >= mail.recipients.length) {
      return false;
    }

    const recipientId = mail.recipients[recipientIndex];

    // Handle both old and new readBy structures
    if (mail.readBy && mail.readBy.length > 0) {
      // Check if readBy is an array of ReadReceipt objects or an array of strings
      if (typeof mail.readBy[0] === 'string') {
        // Old structure: array of strings
        return (mail.readBy as unknown as string[]).includes(recipientId);
      } else {
        // New structure: array of ReadReceipt objects
        return mail.readBy.some(receipt => receipt.userId === recipientId);
      }
    }

    return false;
  }

  /**
   * Gets the timestamp when a recipient read the email
   * @param mail The email to check
   * @param recipientIndex The index of the recipient in the recipientNames array
   * @returns A formatted string with the date and time when the recipient read the email
   */
  public getReadTimestamp(mail: Mail, recipientIndex: number): string {
    if (!mail || !mail.recipients || recipientIndex >= mail.recipients.length) {
      return 'Not read yet';
    }

    const recipientId = mail.recipients[recipientIndex];

    // Handle both old and new readBy structures
    if (mail.readBy && mail.readBy.length > 0) {
      // Check if readBy is an array of ReadReceipt objects or an array of strings
      if (typeof mail.readBy[0] === 'string') {
        // Old structure: array of strings
        if ((mail.readBy as unknown as string[]).includes(recipientId)) {
          return 'Read (time unknown)';
        }
      } else {
        // New structure: array of ReadReceipt objects
        const readReceipt = mail.readBy.find(receipt => receipt.userId === recipientId);
        if (readReceipt) {
          // Format the timestamp as a readable date and time
          const readDate = new Date(readReceipt.timestamp);
          return `Read on ${readDate.toLocaleDateString()} at ${readDate.toLocaleTimeString()}`;
        }
      }
    }

    return 'Not read yet';
  }
}
