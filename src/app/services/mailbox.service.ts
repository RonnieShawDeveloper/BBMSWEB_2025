import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, map, of, switchMap, take } from 'rxjs';
import { Members } from '../models/members';

// Interface for read receipt information
export interface ReadReceipt {
    userId: string;
    timestamp: string;
}

export class Mail {
    constructor(
        public id: string,
        public sender: string,
        public senderId: string,
        public recipients: string[], // Array of recipient IDs
        public recipientNames: string[], // Array of recipient names
        public subject: string,
        public date: string,
        public body: string,
        public attachment: boolean,
        public attachments: string[],
        public unread: boolean, // For recipients
        public readBy: ReadReceipt[], // Array of read receipts with user ID and timestamp
        public sent: boolean,
        public starred: boolean,
        public draft: boolean,
        public trash: boolean,
        public selected: boolean,
        public encryptedBody?: string, // Encrypted version of the message
        public replyToId?: string // Optional ID of the message this is a reply to
    ) { }
}

@Injectable({
    providedIn: 'root'
})
export class MailboxService {
    private currentUserId: string;
    private emailsCollection = 'emails';
    private membersCollection = 'members';

    constructor(private firestore: AngularFirestore) {
        this.refreshCurrentUserId();
    }

    /**
     * Encrypt a message
     * @param text The text to encrypt
     * @returns The encrypted text
     */
    private encryptMessage(text: string): string {
        // Simple encryption for demonstration purposes
        // In a real application, you would use a proper encryption library
        const key = 'BBMS-SECRET-KEY'; // This would be a secure key in a real application
        let result = '';

        // Convert the text to base64 first
        const base64 = btoa(text);

        // Simple XOR encryption with the key
        for (let i = 0; i < base64.length; i++) {
            const charCode = base64.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }

        // Return the encrypted text encoded as base64 for safe storage
        return btoa(result);
    }

    /**
     * Decrypt a message
     * @param encryptedText The encrypted text
     * @returns The decrypted text
     */
    private decryptMessage(encryptedText: string): string {
        if (!encryptedText) return '';

        try {
            // Decode the base64 encrypted text
            const encrypted = atob(encryptedText);
            const key = 'BBMS-SECRET-KEY';
            let result = '';

            // Reverse the XOR encryption
            for (let i = 0; i < encrypted.length; i++) {
                const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }

            // Decode the base64 original text
            return atob(result);
        } catch (error) {
            console.error('Error decrypting message:', error);
            return 'Error: Could not decrypt message';
        }
    }

    /**
     * Refresh the current user ID from localStorage
     * This ensures we always have the latest user ID when querying emails
     */
    private refreshCurrentUserId(): string {
        // Get current user ID from localStorage
        const memberData = localStorage.getItem('member');
        console.log('Member data from localStorage:', memberData);
        if (memberData) {
            try {
                const member = JSON.parse(memberData);
                if (member && member.id) {
                    this.currentUserId = member.id;
                    console.log('Current user ID set to:', this.currentUserId);
                    return this.currentUserId;
                } else {
                    console.error('Member data does not contain an ID:', member);
                }
            } catch (error) {
                console.error('Error parsing member data:', error);
            }
        } else {
            console.error('No member data found in localStorage');
        }
        return null;
    }

    /**
     * Get all emails for the current user (inbox)
     * Emails where the current user is a recipient and not in trash
     */
    public getAllMails(): Observable<Mail[]> {
        // Refresh the current user ID before querying
        const userId = this.refreshCurrentUserId();
        console.log('getAllMails called, currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, returning empty array');
            return of([]);
        }

        return this.firestore.collection<Mail>(this.emailsCollection, ref =>
            ref.where('recipients', 'array-contains', userId)
               .where('trash', '==', false)
               .orderBy('date', 'desc')
        ).snapshotChanges().pipe(
            map(actions => {
                console.log('getAllMails received', actions.length, 'emails');
                return actions.map(a => {
                    const data = a.payload.doc.data() as Mail;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                });
            })
        );
    }

    /**
     * Get starred emails for the current user
     */
    public getStarredMails(): Observable<Mail[]> {
        // Refresh the current user ID before querying
        const userId = this.refreshCurrentUserId();
        console.log('getStarredMails called, currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, returning empty array');
            return of([]);
        }

        return this.firestore.collection<Mail>(this.emailsCollection, ref =>
            ref.where('recipients', 'array-contains', userId)
               .where('starred', '==', true)
               .where('trash', '==', false)
               .orderBy('date', 'desc')
        ).snapshotChanges().pipe(
            map(actions => {
                console.log('getStarredMails received', actions.length, 'emails');
                return actions.map(a => {
                    const data = a.payload.doc.data() as Mail;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                });
            })
        );
    }

    /**
     * Get sent emails by the current user
     */
    public getSentMails(): Observable<Mail[]> {
        // Refresh the current user ID before querying
        const userId = this.refreshCurrentUserId();
        console.log('getSentMails called, currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, returning empty array');
            return of([]);
        }

        return this.firestore.collection<Mail>(this.emailsCollection, ref =>
            ref.where('senderId', '==', userId)
               .where('sent', '==', true)
               .where('trash', '==', false)
               .orderBy('date', 'desc')
        ).snapshotChanges().pipe(
            map(actions => {
                console.log('getSentMails received', actions.length, 'emails');
                return actions.map(a => {
                    const data = a.payload.doc.data() as Mail;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                });
            })
        );
    }

    /**
     * Get draft emails by the current user
     */
    public getDraftMails(): Observable<Mail[]> {
        // Refresh the current user ID before querying
        const userId = this.refreshCurrentUserId();
        console.log('getDraftMails called, currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, returning empty array');
            return of([]);
        }

        return this.firestore.collection<Mail>(this.emailsCollection, ref =>
            ref.where('senderId', '==', userId)
               .where('draft', '==', true)
               .where('trash', '==', false)
               .orderBy('date', 'desc')
        ).snapshotChanges().pipe(
            map(actions => {
                console.log('getDraftMails received', actions.length, 'emails');
                return actions.map(a => {
                    const data = a.payload.doc.data() as Mail;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                });
            })
        );
    }

    /**
     * Get trash emails for the current user
     */
    public getTrashMails(): Observable<Mail[]> {
        // Refresh the current user ID before querying
        const userId = this.refreshCurrentUserId();
        console.log('getTrashMails called, currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, returning empty array');
            return of([]);
        }

        return this.firestore.collection<Mail>(this.emailsCollection, ref =>
            ref.where('trash', '==', true)
               .where('recipients', 'array-contains', userId)
               .orderBy('date', 'desc')
        ).snapshotChanges().pipe(
            map(actions => {
                console.log('getTrashMails received', actions.length, 'emails');
                return actions.map(a => {
                    const data = a.payload.doc.data() as Mail;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                });
            })
        );
    }

    /**
     * Get a specific email by ID
     */
    public getMail(id: string): Observable<Mail> {
        // Refresh the current user ID before querying
        const userId = this.refreshCurrentUserId();
        console.log('getMail called for email ID:', id, 'currentUserId:', userId);

        return this.firestore.doc<Mail>(`${this.emailsCollection}/${id}`).valueChanges().pipe(
            take(1),
            map(mail => {
                console.log('getMail received email:', mail ? 'found' : 'not found');
                if (mail) {
                    // If current user is a recipient and hasn't read the email yet, mark as read
                    if (userId && mail.recipients.includes(userId) &&
                        mail.unread &&
                        !mail.readBy.some(receipt => receipt.userId === userId)) {
                        console.log('Marking email as read');
                        this.markAsRead(id);
                    }
                    return { id, ...mail };
                }
                return null;
            })
        );
    }

    /**
     * Send a new email
     */
    public sendEmail(subject: string, body: string, recipientIds: string[]): Promise<void> {
        console.log('sendEmail called with subject:', subject, 'recipientIds:', recipientIds);
        if (!this.currentUserId || recipientIds.length === 0) {
            console.error('Invalid sender or recipients. currentUserId:', this.currentUserId);
            return Promise.reject('Invalid sender or recipients');
        }

        // Encrypt the message body
        const encryptedBody = this.encryptMessage(body);

        // Get recipient names
        return this.getRecipientNames(recipientIds).then(recipientNames => {
            console.log('Recipient names resolved:', recipientNames);
            // Get current user's name
            return this.getCurrentUserName().then(senderName => {
                console.log('Sender name resolved:', senderName);
                const now = new Date();
                const email: Mail = {
                    id: this.firestore.createId(),
                    sender: senderName,
                    senderId: this.currentUserId,
                    recipients: recipientIds,
                    recipientNames: recipientNames,
                    subject: subject,
                    date: now.toISOString(),
                    body: body,
                    encryptedBody: encryptedBody, // Store the encrypted body
                    attachment: false,
                    attachments: [],
                    unread: true,
                    readBy: [], // Empty array of ReadReceipt objects
                    sent: true,
                    starred: false,
                    draft: false,
                    trash: false,
                    selected: false
                };

                console.log('Saving email to Firestore:', email);
                return this.firestore.collection(this.emailsCollection).doc(email.id).set(email)
                    .then(() => {
                        console.log('Email saved successfully with ID:', email.id);
                    })
                    .catch(error => {
                        console.error('Error saving email:', error);
                        throw error;
                    });
            });
        });
    }

    /**
     * Save email as draft
     */
    public saveDraft(subject: string, body: string, recipientIds: string[] = []): Promise<void> {
        if (!this.currentUserId) {
            return Promise.reject('Invalid sender');
        }

        // Encrypt the message body
        const encryptedBody = this.encryptMessage(body || '');

        // Get recipient names if any
        return this.getRecipientNames(recipientIds).then(recipientNames => {
            // Get current user's name
            return this.getCurrentUserName().then(senderName => {
                const now = new Date();
                const email: Mail = {
                    id: this.firestore.createId(),
                    sender: senderName,
                    senderId: this.currentUserId,
                    recipients: recipientIds,
                    recipientNames: recipientNames,
                    subject: subject || 'no subject',
                    date: now.toISOString(),
                    body: body || '',
                    encryptedBody: encryptedBody, // Store the encrypted body
                    attachment: false,
                    attachments: [],
                    unread: false,
                    readBy: [],
                    sent: false,
                    starred: false,
                    draft: true,
                    trash: false,
                    selected: false
                };

                return this.firestore.collection(this.emailsCollection).doc(email.id).set(email);
            });
        });
    }

    /**
     * Reply to an email
     */
    public replyToEmail(originalEmailId: string, body: string): Promise<void> {
        return this.getMail(originalEmailId).pipe(
            take(1),
            switchMap(originalEmail => {
                if (!originalEmail) {
                    return Promise.reject('Original email not found');
                }

                // Encrypt the message body
                const encryptedBody = this.encryptMessage(body);

                // Reply only to the sender
                const recipientIds = [originalEmail.senderId];
                return this.getRecipientNames(recipientIds).then(recipientNames => {
                    return this.getCurrentUserName().then(senderName => {
                        const now = new Date();
                        const email: Mail = {
                            id: this.firestore.createId(),
                            sender: senderName,
                            senderId: this.currentUserId,
                            recipients: recipientIds,
                            recipientNames: recipientNames,
                            subject: `Re: ${originalEmail.subject}`,
                            date: now.toISOString(),
                            body: body,
                            encryptedBody: encryptedBody, // Store the encrypted body
                            attachment: false,
                            attachments: [],
                            unread: true,
                            readBy: [],
                            sent: true,
                            starred: false,
                            draft: false,
                            trash: false,
                            selected: false,
                            replyToId: originalEmailId
                        };

                        return this.firestore.collection(this.emailsCollection).doc(email.id).set(email);
                    });
                });
            })
        ).toPromise();
    }

    /**
     * Reply to all recipients of an email
     */
    public replyToAllEmail(originalEmailId: string, body: string): Promise<void> {
        return this.getMail(originalEmailId).pipe(
            take(1),
            switchMap(originalEmail => {
                if (!originalEmail) {
                    return Promise.reject('Original email not found');
                }

                // Encrypt the message body
                const encryptedBody = this.encryptMessage(body);

                // Reply to all recipients and the sender, excluding the current user
                const recipientIds = [...originalEmail.recipients, originalEmail.senderId]
                    .filter(id => id !== this.currentUserId);

                return this.getRecipientNames(recipientIds).then(recipientNames => {
                    return this.getCurrentUserName().then(senderName => {
                        const now = new Date();
                        const email: Mail = {
                            id: this.firestore.createId(),
                            sender: senderName,
                            senderId: this.currentUserId,
                            recipients: recipientIds,
                            recipientNames: recipientNames,
                            subject: `Re: ${originalEmail.subject}`,
                            date: now.toISOString(),
                            body: body,
                            encryptedBody: encryptedBody, // Store the encrypted body
                            attachment: false,
                            attachments: [],
                            unread: true,
                            readBy: [],
                            sent: true,
                            starred: false,
                            draft: false,
                            trash: false,
                            selected: false,
                            replyToId: originalEmailId
                        };

                        return this.firestore.collection(this.emailsCollection).doc(email.id).set(email);
                    });
                });
            })
        ).toPromise();
    }

    /**
     * Mark email as read
     */
    public markAsRead(emailId: string): Promise<void> {
        // Refresh the current user ID before performing operation
        const userId = this.refreshCurrentUserId();
        console.log('markAsRead called for email ID:', emailId, 'currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, cannot mark email as read');
            return Promise.reject('No current user ID');
        }

        return this.firestore.doc<Mail>(`${this.emailsCollection}/${emailId}`).get().pipe(
            take(1),
            switchMap(doc => {
                const mail = doc.data() as Mail;
                if (!mail) {
                    console.error('Email not found:', emailId);
                    return Promise.reject('Email not found');
                }

                console.log('Current readBy status:', mail.readBy);
                const readBy = [...mail.readBy];

                // Check if user has already read the email
                const userReadIndex = readBy.findIndex(receipt => receipt.userId === userId);

                // If user hasn't read the email yet, add a new read receipt
                if (userReadIndex === -1) {
                    const now = new Date();
                    readBy.push({
                        userId: userId,
                        timestamp: now.toISOString()
                    });
                    console.log('Added current user to readBy with timestamp:', readBy);
                }

                // If all recipients have read the email, mark as not unread
                const unread = !mail.recipients.every(recipientId =>
                    readBy.some(receipt => receipt.userId === recipientId)
                );
                console.log('Setting unread status to:', unread);

                return this.firestore.doc(`${this.emailsCollection}/${emailId}`).update({
                    readBy,
                    unread
                }).then(() => {
                    console.log('Email marked as read successfully');
                }).catch(error => {
                    console.error('Error marking email as read:', error);
                    throw error;
                });
            })
        ).toPromise();
    }

    /**
     * Mark email as unread
     */
    public markAsUnread(emailId: string): Promise<void> {
        // Refresh the current user ID before performing operation
        const userId = this.refreshCurrentUserId();
        console.log('markAsUnread called for email ID:', emailId, 'currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, cannot mark email as unread');
            return Promise.reject('No current user ID');
        }

        return this.firestore.doc<Mail>(`${this.emailsCollection}/${emailId}`).get().pipe(
            take(1),
            switchMap(doc => {
                const mail = doc.data() as Mail;
                if (!mail) {
                    console.error('Email not found:', emailId);
                    return Promise.reject('Email not found');
                }

                console.log('Current readBy status:', mail.readBy);
                // Remove the current user from the readBy array
                const readBy = mail.readBy.filter(receipt => receipt.userId !== userId);
                console.log('Removed current user from readBy:', readBy);

                return this.firestore.doc(`${this.emailsCollection}/${emailId}`).update({
                    readBy,
                    unread: true
                }).then(() => {
                    console.log('Email marked as unread successfully');
                }).catch(error => {
                    console.error('Error marking email as unread:', error);
                    throw error;
                });
            })
        ).toPromise();
    }

    /**
     * Toggle star status of an email
     */
    public toggleStarStatus(emailId: string): Promise<void> {
        // Refresh the current user ID before performing operation
        const userId = this.refreshCurrentUserId();
        console.log('toggleStarStatus called for email ID:', emailId, 'currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, cannot toggle star status');
            return Promise.reject('No current user ID');
        }

        return this.firestore.doc<Mail>(`${this.emailsCollection}/${emailId}`).get().pipe(
            take(1),
            switchMap(doc => {
                const mail = doc.data() as Mail;
                if (!mail) {
                    console.error('Email not found:', emailId);
                    return Promise.reject('Email not found');
                }

                console.log('Current starred status:', mail.starred);
                const newStarredStatus = !mail.starred;
                console.log('Setting starred status to:', newStarredStatus);

                return this.firestore.doc(`${this.emailsCollection}/${emailId}`).update({
                    starred: newStarredStatus
                }).then(() => {
                    console.log('Email star status toggled successfully');
                }).catch(error => {
                    console.error('Error toggling star status:', error);
                    throw error;
                });
            })
        ).toPromise();
    }

    /**
     * Move email to trash
     */
    public moveToTrash(emailId: string): Promise<void> {
        // Refresh the current user ID before performing operation
        const userId = this.refreshCurrentUserId();
        console.log('moveToTrash called for email ID:', emailId, 'currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, cannot move email to trash');
            return Promise.reject('No current user ID');
        }

        return this.firestore.doc(`${this.emailsCollection}/${emailId}`).update({
            trash: true,
            sent: false,
            draft: false,
            starred: false
        }).then(() => {
            console.log('Email moved to trash successfully');
        }).catch(error => {
            console.error('Error moving email to trash:', error);
            throw error;
        });
    }

    /**
     * Restore email from trash
     */
    public restoreFromTrash(emailId: string): Promise<void> {
        // Refresh the current user ID before performing operation
        const userId = this.refreshCurrentUserId();
        console.log('restoreFromTrash called for email ID:', emailId, 'currentUserId:', userId);

        if (!userId) {
            console.error('No currentUserId, cannot restore email from trash');
            return Promise.reject('No current user ID');
        }

        return this.firestore.doc(`${this.emailsCollection}/${emailId}`).update({
            trash: false
        }).then(() => {
            console.log('Email restored from trash successfully');
        }).catch(error => {
            console.error('Error restoring email from trash:', error);
            throw error;
        });
    }

    /**
     * Search for members by name (for autocomplete)
     */
    public searchMembers(query: string): Observable<Members[]> {
        if (!query || query.length < 3) {
            return of([]);
        }

        // Convert query to lowercase for case-insensitive search
        const searchQuery = query.toLowerCase();

        return this.firestore.collection<Members>(this.membersCollection).valueChanges().pipe(
            map(members => {
                return members.filter(member => {
                    // Search in name, fName, mName, lName
                    const fullName = `${member.fName || ''} ${member.mName || ''} ${member.lName || ''}`.toLowerCase();
                    const name = (member.name || '').toLowerCase();

                    return fullName.includes(searchQuery) ||
                           name.includes(searchQuery) ||
                           (member.fName && member.fName.toLowerCase().includes(searchQuery)) ||
                           (member.lName && member.lName.toLowerCase().includes(searchQuery));
                });
            })
        );
    }

    /**
     * Get all members
     */
    public getAllMembers(): Observable<Members[]> {
        return this.firestore.collection<Members>(this.membersCollection).valueChanges();
    }

    /**
     * Helper method to get recipient names from IDs
     */
    private getRecipientNames(recipientIds: string[]): Promise<string[]> {
        if (recipientIds.length === 0) {
            return Promise.resolve([]);
        }

        const promises = recipientIds.map(id =>
            this.firestore.doc<Members>(`${this.membersCollection}/${id}`).get().pipe(
                take(1),
                map(doc => {
                    const member = doc.data();
                    if (member) {
                        return `${member.fName || ''} ${member.lName || ''}`.trim();
                    }
                    return 'Unknown';
                })
            ).toPromise()
        );

        return Promise.all(promises);
    }

    /**
     * Helper method to get current user's name
     */
    private getCurrentUserName(): Promise<string> {
        return this.firestore.doc<Members>(`${this.membersCollection}/${this.currentUserId}`).get().pipe(
            take(1),
            map(doc => {
                const member = doc.data();
                if (member) {
                    return `${member.fName || ''} ${member.lName || ''}`.trim();
                }
                return 'Unknown';
            })
        ).toPromise();
    }
}
