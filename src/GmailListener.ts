import { google, gmail_v1 } from 'googleapis';
import { EventEmitter } from 'events';

type Credentials = {
  clientId: string,
  clientSecret: string,
  redirectUri: string,
  accessToken: string,
  refreshToken: string,
  scope: string,
  tokenType: string,
  expiryDate: number,
}

type Message = {
  sender: string;
  subject: string;
  body: string;
}

class GmailListener extends EventEmitter {
  private credentials: Credentials;
  private pollInterval: number;
  private gmail: gmail_v1.Gmail;
  private isFirstTime: boolean;
  private lastMessageId: string | null;

  constructor(
    credentials: Credentials,
    pollInterval = 1000,
  ) {
    super();

    this.credentials = credentials;
    this.pollInterval = pollInterval;
    this.isFirstTime = true;
    this.lastMessageId = null;

    this.setupGmailClient();
    this.listenForNewMessages();
  }

  private setupGmailClient() {
    const oAuth2Client = new google.auth.OAuth2(
      this.credentials.clientId,
      this.credentials.clientSecret,
      this.credentials.redirectUri,
    );

    oAuth2Client.setCredentials({
      access_token: this.credentials.accessToken,
      refresh_token: this.credentials.refreshToken,
      expiry_date: this.credentials.expiryDate,
      token_type: this.credentials.tokenType,
    });

    this.gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
  }

  private async listenForNewMessages() {
    try {
      const messageId = await this.getLastMessageId();
      if (!this.isFirstTime && messageId && messageId !== this.lastMessageId) {
        const message = await this.getMessage(messageId);
        this.emit('message', message);
      }

      this.lastMessageId = messageId;
      this.isFirstTime = false;
    } catch (err) {
      this.emit('error', err);
      return;
    }

    setTimeout(() => this.listenForNewMessages(), this.pollInterval);
  }

  private getLastMessageId(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.gmail.users.messages.list({
        userId: 'me',
      }, (err, res) => {
        if (err) return reject(err);

        const messageId = res.data.messages.length ? res.data.messages[0].id : null;
        resolve(messageId);
      });
    });
  }

  private getMessage(id: string): Promise<Message> {
    return new Promise((resolve, reject) => {
      this.gmail.users.messages.get({
        userId: 'me',
        id,
      }, (err, res) => {
        if (err)
          return reject(err);

        try {
          const message = this.extractMessageFromPayload(res.data.payload);
          resolve(message);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private extractMessageFromPayload(payload: gmail_v1.Schema$MessagePart): Message {
    const part = payload.parts.find(part => part.mimeType == 'text/html');
    if (!part) {
      throw new Error('Failed to extract the message, no part with text/html mimeType!');
    }

    return {
      sender: this.extractSpecificHeader('From', payload.headers),
      subject: this.extractSpecificHeader('Subject', payload.headers),
      body: this.decodeBase64(part.body.data),
    };
  }

  private extractSpecificHeader(name: string, headers: Array<gmail_v1.Schema$MessagePartHeader>) {
    const header = headers.find((header) => header.name === name);
    if (!header) {
      throw new Error(`Failed to extract ${name} header!`);
    }

    return header.value;
  }

  private decodeBase64(encodedString: string) {
    return (Buffer.from(encodedString, 'base64')).toString();
  }
}

export default GmailListener;
