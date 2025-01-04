import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {HttpClient, HttpClientModule, HttpHeaders} from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgClass, CommonModule } from '@angular/common';
import { MatNativeDateModule } from "@angular/material/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import {AngularFirestore, DocumentSnapshot} from "@angular/fire/compat/firestore";
import {Suretor} from "../../models/suretor";

@Component({
  selector: 'app-suretor-app',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatInputModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    NgClass,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './suretor-app.component.html',
  styleUrls: ['./suretor-app.component.scss'],
})
export class SuretorAppComponent implements OnInit {
  suretorForm: FormGroup;
  chatMessages: { sender: string; text: string }[] = [];
  userInput = '';
  private openAiApiUrl = 'https://api.openai.com/v1/chat/completions';
  private apiKey = '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';

  @ViewChild('chatWindow') chatWindow!: ElementRef;
  @ViewChild('form-window') formWindow!: ElementRef;

  constructor(private fb: FormBuilder, private http: HttpClient, private firestore: AngularFirestore) {
    this.suretorForm = this.fb.group({
      NIB: ['', Validators.required],
      dob: ['', Validators.required],
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      addressFull: ['', Validators.required],
      poBox: [''],
      phone: ['', [Validators.required, Validators.pattern(/^\d{3}-?\d{3}-?\d{4}$/)]],
      email: ['', [Validators.email]],
      empName: ['', Validators.required],
      empAddress: ['', Validators.required],
      empPhone: ['', [Validators.pattern(/^\d{3}-?\d{3}-?\d{4}$/)]],
      bankName: [''],
      bankAccountType: [''],
      bankBalance: ['', Validators.pattern(/^\d+(\.\d{1,2})?$/)]
    });
    // Add a message to the chat window when the component is initialized
    this.addMessage(
      'ai',
      `Welcome! I'm here to help you complete the Suretor application form. If you have any questions about the form, the suretor process or the bail act, feel free to ask.`
    );
  }

  ngOnInit(): void {}

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.userInput.trim()) {
      const message = this.userInput.trim();
      this.addMessage('user', message);
      this.processUserMessage(message);
      this.userInput = '';
    }
  }

  onSubmit(): void {
    if (this.suretorForm.valid) {
      const formData = this.suretorForm.value;
      this.analyzeFormWithOpenAI(formData);
    } else {
      this.addMessage('ai', 'Form submission failed. Please complete all required fields.');
    }
  }

  private analyzeFormWithOpenAI(formData: any): void {
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an assistant states attorney helping validate a Suretor application form. Check for anything unusual in the data.
          Ensure names look real, and that the age is between 18 and 100. Return any issues found. If no issues are found,
          approve the form for saving. If the form is ok, respond with "approval": "approved". If issues were found, respond with "issues": "description of issues".`
        },
        { role: 'user', content: JSON.stringify(formData) }
      ]
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    });

    this.http.post<OpenAIResponse>(this.openAiApiUrl, payload, { headers }).subscribe(
      (response) => {
        const reply = response.choices[0].message;
        const parsedReply = JSON.parse(reply.content);
        // Add the AI response to formData
        formData.AIComments = parsedReply;
        this.checkAndSaveApplicant(formData);
        console.log('Parsed reply:', parsedReply);
      },
      (error) => {
        console.error('OpenAI Error:', error);
        this.addMessage('ai', 'An error occurred while processing your request. Please try again.');
      }
    );
  }

  private checkAndSaveApplicant(formData: Suretor): void {
    const suretorsRef = this.firestore.collection('suretors');
    formData.spn = formData.NIB;
    suretorsRef
      .doc(formData.NIB)
      .get()
      .subscribe((doc: DocumentSnapshot<Suretor>) => {
        if (doc.exists) {
          this.addMessage('ai', 'An applicant with this NIB number already exists, Updating.');
          suretorsRef
            .doc(formData.NIB)
            .update(formData)
            .then(() => {
              this.addMessage('ai', 'Applicant information has been updated successfully.');
              setTimeout(() => {
                this.clearFormAndChat();
              }, 2000);
            })
          // Reset the form and scroll form to the top

        } else {
          suretorsRef
            .doc(formData.NIB)
            .set(formData)
            .then(() => {
              this.addMessage('ai', 'Applicant information has been saved successfully.');
              setTimeout(() => {
                this.clearFormAndChat();
              }, 2000);
            })
            .catch((error) => {
              console.error('Error saving applicant:', error);
              this.addMessage('ai', 'An error occurred while saving the applicant. Please try again.');
            });
        }
      });


  }

  clearFormAndChat(): void {
    this.suretorForm.reset(); // Reset the form to its initial state
    this.chatMessages = []; // Clear the chat messages
    this.addMessage('ai', 'Welcome! I\'m here to help you complete the Suretor application form. If you have any questions about the form, the suretor process or the bail act, feel free to ask.'); // Notify the user
    // Scroll to the top of the form-window
    this.formWindow.nativeElement.scrollTop;
    // Scroll to the top of the chat-window
    this.chatWindow.nativeElement.scrollTop;
  }


  private addMessage(sender: 'user' | 'ai', text: string): void {
    this.typeMessage(sender, text);
    // this.chatMessages.push({ sender, text });
  }

  private processUserMessage(message: string): void {
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an attorney specialized in helping users understand and complete a Suretor application form for The Bahamas judicial system.
          You can answer questions about the form, the Suretor process, and the Bahamas Bail Act. When asked, check the form fields for completeness and provide guidance on missing fields.
          Avoid attempting to fill out the form directly; instead, provide explanations or clarifications when requested.
          Form Fields include: NIB, DOB, Last Name, First Name, Middle Name, Address, PO Box, Phone, Email, Employer Name, Employer Address, Employer Phone, Bank Name, Bank Account Type, Bank Balance.
          - NIB: National Insurance Board number
          - DOB: Date of Birth
          - Last Name: Suretor's last name
          - First Name: Suretor's first name
          - Middle Name: Suretor's middle name
          - Address: Suretor's full address
          - PO Box: Suretor's PO Box
          - Phone: Suretor's phone number
          - Email: Suretor's email address
          - Employer Name: Suretor's employer name
          - Employer Address: Suretor's employer address
          - Employer Phone: Suretor's employer phone number
          - Bank Name: Suretor's bank name
          - Bank Account Type: Type of bank account
          - Bank Balance: Bank account balance
          A suretor can only be a suretor for one person at a time, unless approved by the courts and the person has the financial ability to be a suretor for multiple people.`
        },
        { role: 'user', content: message }
      ],
      functions: [
        {
          name: 'check_missing_fields',
          description: 'Returns the names of the form fields that still need to be completed.',
          parameters: {
            type: 'object',
            properties: {
              completed_fields: {
                type: 'array',
                description: 'A list of field names that have already been completed.',
                items: { type: 'string' }
              }
            },
            required: ['completed_fields']
          }
        }
      ]
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    });

    this.http.post<OpenAIResponse>(this.openAiApiUrl, payload, { headers }).subscribe(
      (response) => {
        console.log('OpenAI Response:', response);
        const reply = response.choices[0].message;

        if (reply.function_call?.name === 'check_missing_fields') {
          this.handleCheckMissingFields();
        } else if (reply.content) {
          this.addMessage('ai', reply.content);
        }
      },
      (error) => {
        console.error('OpenAI Error:', error);
        this.addMessage('ai', 'An error occurred while processing your request. Please try again.');
      }
    );
  }

  private handleCheckMissingFields(): void {
    const completedFields = Object.keys(this.suretorForm.controls).filter(
      key => this.suretorForm.get(key)?.valid && !!this.suretorForm.get(key)?.value
    );

    console.log('Completed fields:', completedFields);

    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an assistant helping users complete a form. Return the list of missing fields and guide the user to provide the required information.' },
        {
          role: 'function_call',
          function_call: {
            name: 'check_missing_fields',
            arguments: JSON.stringify({ completed_fields: completedFields })
          }
        }
      ],
      functions: [
        {
          name: 'check_missing_fields',
          description: 'Returns the names of the form fields that still need to be completed.',
          parameters: {
            type: 'object',
            properties: {
              completed_fields: {
                type: 'array',
                description: 'A list of field names that have already been completed.',
                items: { type: 'string' }
              }
            },
            required: ['completed_fields']
          }
        }
      ]
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    });

    this.http.post<OpenAIResponse>(this.openAiApiUrl, payload, { headers }).subscribe(
      (response) => {
        const reply = response.choices[0].message;
        console.log('Missing fields response:', reply);

        if (reply.function_call?.name === 'check_missing_fields') {
          const parsedArguments = JSON.parse(reply.function_call.arguments);
          const missingFields = parsedArguments.missing_fields || [];

          if (missingFields.length > 0) {
            this.addMessage(
              'ai',
              `The following fields are still missing: ${missingFields.join(', ')}. Please provide this information to complete the form.`
            );
          } else {
            this.addMessage('ai', 'All form fields have been completed. Thank you!');
          }
        }
      },
      (error) => {
        console.error('OpenAI Error:', error);
        this.addMessage('ai', 'An error occurred while checking for missing fields. Please try again.');
      }
    );
  }

  private typeMessage(sender: 'user' | 'ai', text: string): void {
    const typingDelay = 10; // Delay in milliseconds per character
    let currentText = '';

    const typeNextChar = (index: number) => {
      if (index < text.length) {
        currentText += text[index];
        if (this.chatMessages.length === 0 || this.chatMessages[this.chatMessages.length - 1].sender !== sender) {
          this.chatMessages.push({ sender, text: '' }); // Initialize the message
        }
        this.chatMessages[this.chatMessages.length - 1].text = currentText;

        setTimeout(() => {
          this.chatWindow.nativeElement.scrollTop = this.chatWindow.nativeElement.scrollHeight;
          typeNextChar(index + 1);
        }, typingDelay);
      } else {
        // Ensure the full message is set after typing
        this.chatMessages[this.chatMessages.length - 1].text = text;
        setTimeout(() => {
          this.chatWindow.nativeElement.scrollTop = this.chatWindow.nativeElement.scrollHeight;
        }, typingDelay);
      }
    };

    typeNextChar(0);
  }
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content?: string;
      function_call?: {
        name: string;
        arguments: string;
      };
    };
  }>;
}
