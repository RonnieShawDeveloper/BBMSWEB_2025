# SIEM Function Documentation

## Overview

The SIEM (Security Information and Event Management) function is a scheduled Firebase Cloud Function that monitors bail check-ins and generates daily reports. The function runs at 12:30 AM in the Bahamas timezone every day and sends an encrypted email report about the previous day's check-in compliance to specified recipients.

## Function Purpose

The SIEM function serves the following purposes:
1. Monitors which offenders were required to check in on the previous day
2. Compares required check-ins against actual check-ins recorded in the system for the previous day
3. Generates a report of compliant and non-compliant offenders for the previous day's check-ins
4. Sends an encrypted email to key personnel with the report at 12:30 AM
5. Sends error notifications to a designated administrator when issues occur

## Implementation Details

### Scheduled Execution
- The function runs at 12:30 AM in the Bahamas timezone (America/Nassau) every day
- This timing allows it to process the complete previous day's check-in data
- It uses Firebase's Pub/Sub trigger mechanism for scheduled execution

### Data Sources
- **magistrateBookings collection**: Contains records of offenders on bail with check-in requirements
- **kioskCheckin collection**: Contains records of actual check-ins performed by offenders

### Filtering Logic
1. Calculates the previous day's date and determines its day of the week (Sunday, Monday, Tuesday, etc.)
2. Loads all records from magistrateBookings where:
   - bookingStatus = "Open"
   - custodyStatus = "Released Bail"
   - [previousDay]Checked = true (e.g., mondayChecked = true if the previous day was Monday)
3. Loads all check-in records from kioskCheckin for the entire previous day (from 00:00:00 to 23:59:59)
4. Compares the two sets of records using the afisID field to identify matches

### Report Generation
- Creates an HTML report with two sections:
  1. Violation Offenders: Those who were required to check in but didn't
  2. Compliant Offenders: Those who successfully checked in
- Includes offender photos, names, AFIS IDs, and check-in details

### Email Delivery
- Uses the in-house email system (stored in the emails collection)
- Encrypts the email body using the same encryption method as the mailbox service
- Sends to three specific recipients (member IDs: tbpBuXFFXdQS7gDq6DJz, 1WrrWMegVWvTVj4UwUzX, BomHnl5Pc4CKWbMskgEL)

### Error Handling and Notification
- Implements comprehensive try-catch blocks around critical sections of code
- Captures errors during database queries, report generation, and email sending
- Sends detailed error notifications to a designated administrator (member ID: 1WrrWMegVWvTVj4UwUzX)
- Error notifications include:
  - Error timestamp
  - Context of where the error occurred
  - Detailed error message and stack trace
  - Formatted in an easy-to-read HTML email
- Uses the same in-house email system and encryption as the main report

## Deployment Status

The SIEM function has been successfully deployed to Firebase with the following configuration:
- **Function Name**: siemBailCheckinMonitor
- **Region**: us-central1
- **Runtime**: Node.js 18
- **Memory**: 256 MB
- **Timeout**: 5 minutes (300 seconds)
- **Trigger Type**: Scheduled (Pub/Sub)
- **Schedule**: Every day at 12:30 AM (America/Nassau timezone)

## Required Firestore Indexes

The function requires the following composite indexes in Firestore:
- Collection: magistrateBookings
  - Fields:
    - bookingStatus (Ascending)
    - custodyStatus (Ascending)
    - sundayChecked (Ascending)
- Collection: magistrateBookings
  - Fields:
    - bookingStatus (Ascending)
    - custodyStatus (Ascending)
    - mondayChecked (Ascending)
- Collection: magistrateBookings
  - Fields:
    - bookingStatus (Ascending)
    - custodyStatus (Ascending)
    - tuesdayChecked (Ascending)
- Collection: magistrateBookings
  - Fields:
    - bookingStatus (Ascending)
    - custodyStatus (Ascending)
    - wednesdayChecked (Ascending)
- Collection: magistrateBookings
  - Fields:
    - bookingStatus (Ascending)
    - custodyStatus (Ascending)
    - thursdayChecked (Ascending)
- Collection: magistrateBookings
  - Fields:
    - bookingStatus (Ascending)
    - custodyStatus (Ascending)
    - fridayChecked (Ascending)
- Collection: magistrateBookings
  - Fields:
    - bookingStatus (Ascending)
    - custodyStatus (Ascending)
    - saturdayChecked (Ascending)

These indexes have been manually created in the Firebase console.

## Monitoring and Troubleshooting

### Viewing Logs
To view logs for the SIEM function, use the following command:
```
firebase functions:log --only siemBailCheckinMonitor
```

### Common Issues
- **Missing Check-ins**: If offenders are not showing up in either list, verify that their records in magistrateBookings have the correct day of week checked for the previous day (e.g., if the report runs on Tuesday at 12:30 AM, check that mondayChecked = true for offenders who should have checked in on Monday)
- **Email Delivery Issues**: Check the function logs for any errors related to email sending or recipient retrieval
- **Index Errors**: If you see errors about missing indexes, ensure all required indexes are created in Firestore
- **Time Range Issues**: If check-ins are missing from the report, verify that the check-in timestamps (unix field) are correctly formatted as Unix timestamps in seconds

### Error Notifications
- The designated administrator (member ID: 1WrrWMegVWvTVj4UwUzX) will receive email notifications when errors occur
- These notifications provide detailed information about the error, including:
  - The context in which the error occurred
  - The error message and stack trace
  - The timestamp of when the error occurred
- Check the administrator's inbox for these notifications if the function is not working as expected
- Even if the function fails to complete its main task, it will attempt to send an error notification

## Maintenance Considerations

### Short-term Maintenance
- Monitor the function's execution through logs to ensure it's running correctly
- Verify that emails are being delivered properly to the intended recipients
- Check that the report accurately reflects check-in compliance

### Long-term Maintenance

#### Node.js Runtime Upgrade
- **Current Runtime**: Node.js 18
- **Issue**: This runtime was deprecated on 2025-04-30 and will be decommissioned on 2025-10-30
- **Action Required**: Upgrade to a newer Node.js runtime before 2025-10-30
- **How to Upgrade**: Update the runtime in the functions/package.json file and redeploy

#### Firebase Functions Package Upgrade
- **Current Version**: 4.4.1
- **Latest Version**: >=5.1.0
- **Issue**: The current version doesn't support the newest Firebase Extensions features
- **Action Required**: Upgrade to the latest version
- **How to Upgrade**: Run `npm install --save firebase-functions@latest` in the functions directory
- **Note**: There will be breaking changes when upgrading, so test thoroughly after upgrading

#### Functions Config API Migration
- **Issue**: The functions.config() API is deprecated and will stop working after December 31, 2025
- **Action Required**: Migrate to using environment variables with dotenv
- **Migration Guide**: https://firebase.google.com/docs/functions/config-env#migrate-to-dotenv

#### Firebase CLI Update
- **Current Version**: 14.11.2
- **Latest Version**: 14.12.0
- **Action Required**: Update the Firebase CLI
- **How to Update**: Run `npm install -g firebase-tools`

## Conclusion

The SIEM function provides automated monitoring of bail check-in compliance and delivers daily reports to key personnel. By following the maintenance recommendations outlined above, you can ensure the function continues to operate correctly and takes advantage of the latest features and security updates.
