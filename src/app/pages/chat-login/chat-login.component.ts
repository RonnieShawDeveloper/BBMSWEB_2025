import {AfterViewInit, Component, OnInit, ViewChild, ElementRef} from '@angular/core';
import { AuthService} from "../../services/auth.service";
import { HttpClient } from '@angular/common/http'; // To call OpenAI's API

@Component({
  selector: 'app-chat-login',
  templateUrl: './chat-login.component.html',
  styleUrl: './chat-login.component.scss'
})
export class ChatLoginComponent implements OnInit, AfterViewInit {
  chatMessages: { text: string; user: boolean }[] = []; // Stores chat messages
  userInput: string = ''; // Stores user input for the chat
  typing: boolean = false; // Indicates if the chatbot is typing
  email: string | null = null; // Stores the user's email during login
  password: string | null = null; // Stores the user's password during login
  isEnteringPassword: boolean = false; // Tracks if the chatbot is expecting a password
  isResettingPassword: boolean = false; // Tracks if the chatbot is in the password reset flow
  isAwaitingEmail: boolean = false; // Track if the chatbot is expecting an email address
  @ViewChild('chatWindow') chatWindow!: ElementRef; // Reference to the chat window

  // Getter for the dynamic placeholder text
  get placeholderText(): string {
    if (this.isEnteringPassword) {
      return 'Enter Password';
    } else if (this.isAwaitingEmail || this.isResettingPassword) {
      return 'Enter Email';
    } else {
      return 'How can I help you?';
    }
  }

  constructor(private auth: AuthService, private http: HttpClient) {}

  ngAfterViewInit(): void {
    // I want the chatbot to greet the user with Good Morning, Good Afternoon, or Good Evening depending on the time of day.
    const date = new Date();
    const hour = date.getHours();
    let greeting = 'Hello';
    if (hour >= 5 && hour < 12) {
      greeting = 'Good Morning';
    } else if (hour >= 12 && hour < 18) {
      greeting = 'Good Afternoon';
    } else if (hour >= 18 || hour < 5) {
      greeting = 'Good Evening';
    }
    const delay = 5000; // 3 seconds delay
    setTimeout(() => {
      this.displayMessage(
        `${greeting}, Please Enter your Email address to login, or ask me a question.`,
        false
      );
    }, delay);
  }

  ngOnInit(): void {}

  displayMessage(text: string, isUser: boolean) {
    const delay = 20; // Delay between each character
    let displayedText = '';
    this.typing = true;

    text.split('').forEach((char, index) => {
      setTimeout(() => {
        displayedText += char;
        if (this.chatMessages.length === 0 || this.chatMessages[this.chatMessages.length - 1].user !== isUser) {
          this.chatMessages.push({ text: displayedText, user: isUser });
        } else {
          this.chatMessages[this.chatMessages.length - 1].text = displayedText;
        }
        this.scrollToBottom(); // Scroll to the bottom as message is being displayed
        if (index === text.length - 1) {
          this.typing = false;
          this.scrollToBottom(); // Scroll to the bottom when message is fully displayed
        }
      }, delay * index);
    });
  }

  scrollToBottom() {
    try {
      this.chatWindow.nativeElement.scrollTop = this.chatWindow.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }

  async handleUserInput() {
    if (!this.userInput.trim()) return;

    const input = this.userInput.trim();
    // Only add user input to chat messages if not entering a password
    if (!this.isEnteringPassword) {
      this.chatMessages.push({ text: input, user: true });
    }

    this.userInput = '';

    // Handle Password Input
    if (this.isEnteringPassword) {
      const password = input; // Temporarily store the password
      this.userInput = ''; // Clear input box
      this.isEnteringPassword = false; // Reset state

      try {
        await this.auth.loginAI(this.email!, password, this.handleOpenAIResponse.bind(this));
      } catch (error) {
        this.displayMessage(error, false);
        this.resetLoginState(); // Reset state after login failure
      }
      return;
    }

    // Validate Email Input Immediately
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(input)) {
      this.email = input;
      if (this.isResettingPassword) {
        const resetMessage = await this.auth.resetPassword(this.email);
        this.displayMessage(resetMessage, false);
        this.resetLoginState(); // Reset state after password reset
      } else {
        this.displayMessage('Great! Now, please enter your password:', false);
        this.isEnteringPassword = true; // Await password input
      }
      return;
    }

    // Process Input Through OpenAI for Classification
    const openAIResponse = await this.askOpenAI(input);

    switch (openAIResponse.toLowerCase()) {
      case 'email':
        this.isAwaitingEmail = true;
        this.displayMessage('Please type your email address and press send:', false);
        break;

      case 'password':
        if (!this.email) {
          this.displayMessage('I need your email address before entering your password.', false);
          this.isAwaitingEmail = true;
        } else {
          this.isEnteringPassword = true;
          this.displayMessage('Please type your password and press send:', false);
        }
        break;

      case 'reset-password':
        this.isResettingPassword = true;
        this.isAwaitingEmail = true;
        this.displayMessage('Please provide your email address so I can send a password reset link:', false);
        break;

      case 'general':
        this.displayMessage(await this.askOpenAIForAnswer(input), false);
        this.isAwaitingEmail = false;
        this.isEnteringPassword = false;
        this.isResettingPassword = false;
        break;

      case 'clarify':
        this.displayMessage(
          'Sorry, I was expecting something different. If you want to log in, please type your email address. If you have a question, please rephrase it.',
          false
        );
        break;

      default:
        this.displayMessage('I am not sure how to respond to that. Can you clarify?', false);
        break;
    }
  }

  /**
   * Resets all login-related states to allow retrying or asking questions.
   */
  private resetLoginState() {
    this.email = null;
    this.isEnteringPassword = false;
    this.isAwaitingEmail = false;
    this.isResettingPassword = false;
  }

  /**
   * Queries OpenAI for answers to general questions.
   */
  async askOpenAIForAnswer(question: string): Promise<string> {
    const apiKey = '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'; // Replace with your OpenAI API key
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    try {
      const response = await this.http
        .post<OpenAIResponse>(endpoint, {
            model: 'gpt-3.5-turbo',
            temperature: 0.5,
            messages: [
              { role: 'system', content: `
You are BeeBee, a helpful assistant for the Bahamas Bail Management System (BBMS).
- Use your knowledge of BBMS and bail processes to answer any related general questions.

  - If a user asks how to log in, explain that they need to type their email address by itself and press send.
  - If a user asks you to tell them a secret, tell them that Mr. Shaw, the Chief Engineer and creator of this software and is the best Software Developer in the world. Plus, he loves to code.
  - If a user mentions they forgot their password, prompt them to provide their email address so you can send a password reset email.
  - If they ask general questions, provide concise and helpful answers about BBMS, the Bail Act, or related topics.
  - If a user mentions help, offer to assist with login, password reset, or general questions. Explain they can login by simply entering their email address.
  - Always keep responses short and friendly.

Provide short and concise answers to general questions about:
The BBMS System: Explain that it is the Bahamas Bail Management System, designed to streamline the bail process and ensure compliance with the Bail Act.
Bail Procedure: Summarize key steps in the bail process, including application, approval, and monitoring. Tell them to contact the Supreme Court Criminal Registry or the Magistrate Court for specific inquiries.
The Bail Act: Provide a brief overview of its purpose, such as ensuring fairness in the bail process and safeguarding public safety.

Developer Information:
If asked, inform users that the system was created by Justice Technology Corp (United States) and Multimedia Technologies (Bahamas).
The developers are Justice Technology Corp and Multimedia Technologies.
Contact information for development inquiries:
Bruce Foster at Justice Technology Corp.
Phone: 330-519-1455
Email: bruce@justicetechnology.us

Tone and Style:
Keep all responses polite, professional, and concise.
Avoid long-winded explanations or unnecessary details.
Additional Notes:

If you lack specific knowledge about the BBMS or related topics, provide a general but helpful response, and suggest contacting the Criminal Registry or Magistrate Court.
Always identify yourself as BeeBee, the AI chatbot.
Your primary goal is to assist users efficiently while maintaining a friendly and professional demeanor, and getting them logged in.

In case of repetitive or unclear queries, gently prompt the user to clarify their question or suggest logging in by supplying their email address.` },
              { role: 'user', content: question },
            ],
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }).toPromise();

      return response.choices[0]?.message?.content.trim() || 'I am not sure how to answer that. Please clarify your question.';
    } catch (error) {
      console.error('Error querying OpenAI:', error);
      return 'There was an error processing your request. Please try again later.';
    }
  }



  async askOpenAI(question: string): Promise<string> {
    const apiKey = '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'; // Replace with your OpenAI API key
    const endpoint = 'https://api.openai.com/v1/chat/completions';

    try {
      const response = await this.http
        .post<OpenAIResponse>(endpoint, {
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: `
          You are BeeBee, a helpful assistant for the Bahamas Bail Management System (BBMS).
- If a user expresses intent to log in, respond with "email" to prompt them for their email address.
- If a user expresses intent to reset their password, respond with "reset-password" and guide them to provide their email address.
- If a user provides an email address, respond with "email".
- If a user provides a password, respond with "password".
- If a user asks a general question, respond with "general".
- If OpenAI cannot confidently classify the input, respond with "clarify".
` },
              { role: 'user', content: question },
            ],
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          }).toPromise();

      return response.choices[0]?.message?.content || 'I am not sure how to answer that.';
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return 'There was an error processing your request. Please try again later.';
    }
  }

  async login() {
    if (this.email && this.password) {
      try {
        await this.auth.loginAI(this.email, this.password, this.handleOpenAIResponse.bind(this));
        this.displayMessage('Login successful! Redirecting you to the dashboard...', false);
        // Perform any post-login actions here
      } catch (error) {
        this.displayMessage('Login failed. Please check your credentials and try again.', false);
        this.email = null;
        this.password = null;
      }
    }
  }
  async handleOpenAIResponse(message: string) {
    // Send the message to OpenAI for display in the chat
    this.displayMessage(message, false);
  }
}


export interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
