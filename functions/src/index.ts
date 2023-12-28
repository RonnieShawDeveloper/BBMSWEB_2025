import {Hearings} from "./hearings";
import {Members} from "./members";
import {Photos} from "./photos";
import {Booking} from "./booking";
import {firestore} from "firebase-admin";
import QuerySnapshot = firestore.QuerySnapshot;

const functions = require('firebase-functions');
const nodeMailer = require('nodemailer');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

exports.emailMagistrate = functions.firestore.document('magistrateBookings/{bookingId}').onUpdate(async (change: any, context: any) => {
  functions.logger.info('Changed Item: %s', change.after.data() as Booking);

  // If the bailStatus is 'submitted' and the 'magistrateEmailSent' flag is false, get the members record for the magistrate using the 'judgeID' and send and email to the address found in the members record
  async function sendEmail(): Promise<boolean|undefined> {
    const booking: Booking = change.after.data() as Booking;
    // functions.logger.info('Judge ID: %s', booking.judgeID);
    let member: Members = {};
    // Check to see if the booking has been submitted and if so, send an email to the magistrate
    if (booking.bailStatus === 'submitted' && booking.magistrateEmailSent === false) {

      try {
        let querySnapshot: QuerySnapshot = await db.collection('members').where('uid', '==', booking.judgeID).get();
        querySnapshot.forEach((doc) => {
          member = doc.data() as Members;
        });
      } catch (error) {
        functions.logger.error('Error getting member: ', error);
        return false;
      }
      // functions.logger.info('Member Email: %s', member.email);

      const html: string = `
    <div style="text-align: center;"><img src="https://bbmsweb.com/assets/img/app/judiciary_logo.png" alt="Judiciary Logo"></div>
    <div style="text-align: center;background: #ed0303;"><span style="font-weight: bold;font-size: 28px;color: rgb(240,242,244);">NEW BOND APPLICATION HAS BEEN SUBMITTED</span></div>
    <div class="table-responsive">
        <table>
            <tbody>
                <tr>
                    <td style="text-align: center;background: rgb(0,160,228);color: rgb(255,255,255);font-weight: bold;padding:10px">
                    <img src='${booking.photoURL}' style="max-width: 400px; width: 100%">
                    </td>
                </tr>
                <tr>
                    <td>
                        <div>
                            <table>
                                <tbody>
                                    <tr style="margin: 5px; background-color: lightgray">
                                        <td style="width: 30%;text-align: right;font-weight: bold;">Name</td>
                                        <td>${booking.lastName}, ${booking.firstName} ${booking.middleName?booking.middleName:''}<br>DOB: ${booking.dob}</td>
                                    </tr>
                                    <tr style="margin: 5px;">
                                        <td style="width: 30%;text-align: right;font-weight: bold;">Address</td>
                                        <td>${booking.address1} ${booking.address2}<br>${booking.locality} ${booking.island}</td>
                                    </tr>
                                    <tr style="margin: 5px; background-color: lightgray">
                                        <td style="width: 30%;text-align: right;font-weight: bold;">Bond Amount</td>
                                        <td>${booking.bailAmount}</td>
                                    </tr>
                                    <tr style="margin: 5px;">
                                        <td style="width: 30%;text-align: right;font-weight: bold;">Suretor Name</td>
                                        <td>${booking.suretorName}</td>
                                    </tr>
                                    <tr style="margin: 5px; background-color: lightgray">
                                        <td style="width: 30%;text-align: right;font-weight: bold;">Surety Requirements</td>
                                        <td>${booking.suretyReq}</td>
                                    </tr>
                                    <tr style="margin: 5px;">
                                        <td style="width: 30%;text-align: right;font-weight: bold;">Additional Requirements</td>
                                        <td>${booking.additionalConditions}</td>
                                    </tr>
                                    <tr style="margin: 5px; background-color: lightgray">
                                        <td style="width: 30%;text-align: right;font-weight: bold;">Comments</td>
                                        <td>${booking.bookingComments}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    <div style="text-align: center; margin: 5px"><span>Please log in to the BBMS PORTAL to see all documents and information that has been provided in this matter. You may use the tools provided to approve or deny this application.</span></div>`;


// Send the Email to the Judge
      const transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'bahamas.bail@courts.gov.bs',
          pass: 'Flashuser20@',
        },
      });

      // get the current date and time formatted as 'Jan 01, 2000 at 12:00 AM Eastern Time'


      const date = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
      await transporter.sendMail({
        from: 'bahamas.bail@courts.gov.bs',
        to: member.email,
        cc: ['ronnie.shaw@justicetechnology.us', 'bruce@justicetechnology.us'],
        subject: 'MAGISTRATE COURT: New Bond Application for ' + booking.lastName + ', ' + booking.firstName + ' on ' + date,
        html: html,
        text: 'YOUR DEVICE DOES NOT SUPPORT HTML EMAILS',
      }).catch((err: any) => {
        functions.logger.error('Error sending email to magistrate: ', err);
      });
      // Edit the booking record to set the magistrateEmailSent flag to true
      await db.collection('magistrateBookings').doc(context.params.bookingId).update({
        magistrateEmailSent: true
      } as Booking);
      return true;
    } else {
      return false;
    }
  }
  sendEmail().then((result: boolean|undefined) => {
    if(result) {
      functions.logger.info('Message sent - Booking ID: %s', context.params.bookingId);
    }
  }).catch((error: any) => {
    functions.logger.error(error);
  }); // End SendEmail
});


// This function listens to the collection 'hearings' and sends an email when a bail bond is issued.
exports.emailBond = functions.firestore.document('hearings/{hearingId}').onUpdate(async (change: any, context: any) => {
  async function sendEmail() : Promise<boolean|undefined> {
    // Get the Hearing that changed
    const hearing: Hearings = change.after.data();

    // Check to see if a hearing has been assigned to a judge and if so, notify the judge through his email otherwise, do next check.
    if (hearing.judgeID && hearing.hearingDateUnix && !hearing.judgeNewHearingAssignedEmailed) {
      functions.logger.info('New Bail Application Hearing - Sending Email to Judge');
      // Get the Judges Information
      db.collection('members').doc(hearing.judgeID).get().then(async (doc: any) => {
        const judgeInfo: Members = doc.data() as Members;
        // Check if judgeInfo has a valid email address and if not, return false.
        if (!judgeInfo.email) {
          // Validate the email address to check if valid format
          if (judgeInfo.email && !validateEmail(judgeInfo.email)) {
            return false;
          }
          return false;
        }
        // Create the  Email with the proper informatio to inform the judge about the upcoming Bail Hearing.
        const html = `
        <div style="text-align: center;"><img src="https://bbmsweb.com/assets/img/app/judiciary_logo.png" alt="Judiciary Logo"></div>
        <div style="text-align: center;font-weight: bold;font-size: 25px;">
            <span style="color: #ee0b21;">SUPREME COURT - NEW BAIL APPLICATION HEARING ASSIGNED</span>
        </div>
        <div style="text-align: center;font-size: 14px;">
            <span>This notice is to inform you that a Bail Hearing for ${hearing.offenderName} has been assigned to you by The Supreme Court Criminal Registrar.<br>
                  A copy of the application has been included with this email. Please login to the BBMSWEB.COM Portal for more information</span>
        </div>
        <div style="width: 100%; text-align: center">
            <div class="">
                <table style="width: 100%">
                    <tr>
                         <td style="text-align: center">
                            <table class="table">
                                <tbody>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">HEARING ID</span><br>
                                        <span style="font-size: 14px;padding:5px">This is a unique identified assigned to this hearing</span></td>
                                        <td style="width: 60%;background: #fcf2f2;">${context.params.hearingId}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">SUPREME COURT JUSTICE</span><br>
                                        <span style="font-size: 14px">This is the Judge who has been assigned</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px">${hearing.judgeName ? hearing.judgeName : 'Not Assigned'}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">DEFENDANT NAME & PHOTO</span><br>
                                        <span style="font-size: 14px">Photo and Defendant Name</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px; text-align: center">
                                        <img src="${getMainPhoto(hearing.offenderID)}" width="300px" alt="Offender Photo">
                                        <div>${hearing.offenderName}</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">HEARING DATE</span><br>
                                        <span style="font-size: 14px">Date the Hearing is Set For (Eastern Time)</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px">${convertUnixTimestamp(hearing.hearingDateUnix)}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">APPLICATION</span><br>
                                        <span style="font-size: 14px">A PDF Copy of the Application</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px"><a href="${hearing.bailAppLink}" target="_blank">CLICK HERE TO VIEW APPLICATION</a></td>
                                    </tr>
                                </tbody>
                            </table>
                         </td>
                    </tr>
                </table>
            </div>
        </div>
        <div style="text-align: center; font-size: 12px"><span>If you have any questions regarding this hearing, please contact Deputy Registrar Edmund Turner at the Criminal Registry.</span></div>
      `;

        // Send the Email to the Judge
        const transporter = nodeMailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: 'bahamas.bail@courts.gov.bs',
            pass: 'Flashuser20@',
          },
        });
        await transporter.sendMail({
          from: 'bahamas.bail@courts.gov.bs',
          to: judgeInfo.email,
          cc: ['nixond1@hotmail.com','ronnie.shaw@justicetechnology.us', 'bruce@justicetechnology.us'],
          subject: 'New Bail Hearing set for ' + hearing.offenderName,
          html: html,
          text: 'YOUR DEVICE DOES NOT SUPPORT HTML EMAILS',
        }).catch((err: any) => {
          functions.logger.error('Error sending email to judge: ', err);
        });
        await db.collection('hearings').doc(context.params.hearingId).update({
          judgeNewHearingAssignedEmailed : true
        });
        return true;
      }); // End of Get Judge Information
    } // End Check if Judge Assigned New Hearing

    // Check to see if a bail bond was issued by looking at the link and the email flag.
    if (hearing.bailBondLink && !hearing.bailBondEmailed) {

      const html = `
        <div style="text-align: center;"><img src="https://bbmsweb.com/assets/img/app/judiciary_logo.png" alt="Judiciary Logo"></div>
        <div style="text-align: center;font-weight: bold;font-size: 25px;"><span style="color: #ee0b21;">DEFENDANT BOND RELEASE NOTIFICATION</span></div>
        <div style="text-align: center;font-size: 14px;"><span>This notice is to inform you that ${hearing.offenderName} is being released on bond by The Supreme Court Criminal Registrar.<br>A copy of the bond has been included with this email.</span></div>
        <div style="width: 100%; text-align: center">
            <div class="">
                <table style="width: 100%">
                    <tr>
                         <td style="text-align: center">
                            <table class="table">
                                <tbody>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">HEARING ID</span><br>
                                        <span style="font-size: 14px;padding:5px">This is a unique identified assigned to this hearing</span></td>
                                        <td style="width: 60%;background: #fcf2f2;">${context.params.hearingId}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">SUPREME COURT JUSTICE</span><br>
                                        <span style="font-size: 14px">This is the Judge who granted release</span></td>
                                        <td style="width: 60%;background: #fcf2f2;;padding:5px">${hearing.judgeName ? hearing.judgeName : 'Not Assigned'}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">DEFENDANT NAME & PHOTO</span><br>
                                        <span style="font-size: 14px">Photo and Defendant Name</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px; text-align: center">
                                        <img src="${getMainPhoto(hearing.offenderID)}" width="300px" alt="Offender Photo">
                                        <div>${hearing.offenderName}</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">CHECK-IN LOCATION</span><br>
                                        <span style="font-size: 14px">The Location the Defendant must report to</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px">${hearing.bailReportLocation ? hearing.bailReportLocation : 'Any Location with a Kiosk'}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">CHECK-IN TIME AND DAYS</span><br>
                                        <span style="font-size: 14px">MUST REPORT ON THESE DAYS</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px">Must Report before ${hearing.bailReportTime ? hearing.bailReportTime : '9PM'} on ${hearing.bailReportDays ? hearing.bailReportDays : 'Friday'}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">BOND</span><br>
                                        <span style="font-size: 14px">A PDF Copy of the Bond</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px"><a href="${hearing.bailBondLink}" target="_blank">CLICK HERE TO VIEW BOND</a></td>
                                    </tr>
                                </tbody>
                            </table>
                         </td>
                    </tr>
                </table>
            </div>
        </div>
        <div style="text-align: center; font-size: 12px"><span>If you have any questions regarding the release of this individual, please contact Deputy Registrar Edmund Turner at the Criminal Registry.</span></div>
      `;

      const transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'bahamas.bail@courts.gov.bs',
          pass: 'Flashuser20@',
        },
      });
      // const mailList = ['rdspromo@gmail.com', 'ronnie.shaw@justicetechnology.us', 'darron.nixon@rbpf.bs', 'garth.harris@rbpf.bs', ''];
      await transporter.sendMail({
        from: 'bahamas.bail@courts.gov.bs',
        to: [ 'nixond1@hotmail.com', 'darron.nixon@rbpf.bs', 'garth.harris@rbpf.bs', 'edmund.turner@courts.gov.bs', 'evenlyloved4@gmail.com', 'emuoffice10@gmail.com'],
        cc: ['ronnie.shaw@justicetechnology.us', 'bruce@justicetechnology.us'],
        subject: 'Bond Release Information for ' + hearing.offenderName,
        html: html,
        text: 'YOUR DEVICE DOES NOT SUPPORT HTML EMAILS',
      });
      await db.collection('hearings').doc(context.params.hearingId).update({
        bailBondEmailed: true
      });
      return true;
    }
    return false;
  }

  function validateEmail(email: string): boolean {
    // Use regex to validate email
    const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  function convertUnixTimestamp(unixTimestamp: string | number | undefined): string {
    // Check is timestamp is null, empty or undefined
    if(!unixTimestamp) return ('Time Not Set');

    // check is unixTimestamp is a string and convert to number
    if (typeof unixTimestamp === 'string') {
      unixTimestamp = Number(unixTimestamp);
    }
    // Check if the timestamp is in Milliseconds and convert to seconds
    if (unixTimestamp.toString().length === 10) {
      unixTimestamp = unixTimestamp *+ 1000;
    }
    // Return the date in the format Jan 01, 2000 at 12:00 AM Eastern Time
    return new Date(unixTimestamp).toLocaleString('en-US', {timeZone: 'America/New_York', month: 'long', day: '2-digit', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true });
  }

  // Get main Photo of Defendant
  async function getMainPhoto(offenderID: string | undefined): Promise<string> {
    if (!offenderID) return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
    await db.collection('photos').where('offenderID', '==', offenderID).get().then((querySnapshot: any) => {
      const photo: Photos = querySnapshot.docs[0].data() as Photos;
      // Loop through the photos.photos array to find the 'photoMain' = true and return the photoUrl
      // Check to see of photo is undefined or null
      if (!photo || !photo.photos) return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
      for (const photoUrl of photo.photos) {
        if (photoUrl.photoMain) {
          return photoUrl.photoUrl;
        }
      }
      return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
    }).catch((error: any) => {
      functions.logger.error(error);
      return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
    });
    return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
  }

  sendEmail().then((result: boolean|undefined) => {
    if(result) {
      functions.logger.info('Message sent - Hearing ID: %s', context.params.hearingId);
    }
  }).catch((error: any) => {
    functions.logger.error(error);
  }); // End SendEmail
});


// This function will send an email to the registrar when a new application is submitted (hearing Created)
exports.newApplication = functions.firestore.document('hearings/{hearingId}').onCreate(async (snap: any, context: any) => {
  async function sendApp(): Promise<boolean|undefined> {
    const hearing: Hearings = snap.data();

    if (!hearing.registrarAck && !hearing.newApplicationEmail) {
      const html = `
        <div style="text-align: center;"><img src="https://bbmsweb.com/assets/img/app/judiciary_logo.png" alt="Judiciary Logo"></div>
        <div style="text-align: center;font-weight: bold;font-size: 25px;"><span style="color: #ee0b21;">NEW BAIL APPLICATION NOTIFICATION</span></div>
        <div style="text-align: center;font-size: 14px;"><span>This notice is to inform you that ${hearing.offenderName} has submitted a new bail application. Please check the Registrar Portal</span></div>
        <div style="width: 100%; text-align: center">
            <div class="">
                <table style="width: 100%">
                    <tr>
                         <td style="text-align: center">
                            <table style="max-width: 600px">
                                <tbody>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">HEARING ID</span><br>
                                        <span style="font-size: 14px;padding:5px">This is a unique identified assigned to this hearing</span></td>
                                        <td style="width: 60%;background: #fcf2f2;">${context.params.hearingId}</td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">DEFENDANT NAME & PHOTO</span><br>
                                        <span style="font-size: 14px">Photo and Defendant Name</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px; text-align: center">
                                        <img src="${getMainPhoto(hearing.offenderID)}" width="300px" alt="Offender Photo">
                                        <div>${hearing.offenderName}</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: right;width: 40%;background: #e1dfdf;padding:5px">
                                        <span style="font-size: 18px; font-weight: bold">APPLICATION</span><br>
                                        <span style="font-size: 14px">A PDF Copy of the Bail Application</span></td>
                                        <td style="width: 60%;background: #fcf2f2;padding:5px"><a href="${hearing.bailAppLink}" target="_blank">CLICK HERE TO VIEW APPLICATION</a></td>
                                    </tr>
                                </tbody>
                            </table>
                         </td>
                    </tr>
                </table>

            </div>
        </div>
        <div style="text-align: center; font-size: 12px"><span>If you have any questions regarding this individual, please contact Deputy Registrar Edmund Turner at the Criminal Registry.</span></div>
      `;

      const transporter = nodeMailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'bahamas.bail@courts.gov.bs',
          pass: 'Flashuser20@',
        },
      });
      // const mailList = ['rdspromo@gmail.com', 'ronnie.shaw@justicetechnology.us', 'darron.nixon@rbpf.bs', 'garth.harris@rbpf.bs', ''];
      await transporter.sendMail({
        from: 'bahamas.bail@courts.gov.bs',
        to: ['edmund.turner@courts.gov.bs', 'evenlyloved4@gmail.com'],
        cc: ['nixond1@hotmail.com','ronnie.shaw@justicetechnology.us', 'bruce@justicetechnology.us'],
        subject: 'New Bail Application submitted for ' + hearing.offenderName,
        html: html,
        text: 'YOUR DEVICE DOES NOT SUPPORT HTML EMAILS',
      });
      await db.collection('hearings').doc(context.params.hearingId).update({
        newApplicationEmail: true
      } as Hearings);
      return true;
    }
    return false;
  }

  // Get main Photo of Defendant
  async function getMainPhoto(offenderID: string | undefined): Promise<string> {
    if (!offenderID) return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
    await db.collection('photos').where('offenderID', '==', offenderID).get().then((querySnapshot: any) => {
      const photo: Photos = querySnapshot.docs[0].data() as Photos;
      // Loop through the photos.photos array to find the 'photoMain' = true and return the photoUrl
      // Check to see of photo is undefined or null
      if (!photo.photos || photo.photos?.length === 0) return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
      for (const photoUrl of photo.photos) {
        if (photoUrl.photoMain) {
          return photoUrl.photoUrl;
        }
      }
      return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
    }).catch((error: any) => {
      functions.logger.error(error);
      return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
    });
    return 'https://bbmsweb.com/assets/img/users/default-user.jpg';
  }

  sendApp().then((result: boolean|undefined) => {
    if(result) {
      functions.logger.info('Message sent - Hearing: %s', context.params.hearingId);
    }
  }).catch((error: any) => {
    functions.logger.error(error);
  }); // End SendApp
}); // End New Application
