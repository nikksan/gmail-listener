import { google, gmail_v1 } from 'googleapis';
import { EventEmitter } from 'events';

type Credentials = {
  accessToken: string,
  refreshToken: string,
  scope: string,
  tokenType: string,
  expiryDate: number,
}

type Message = {
  sender: string;
  body: string;
}

class GmailListener extends EventEmitter {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private credentials: Credentials;
  private pollInterval: number;
  private gmail: gmail_v1.Gmail;
  private hasFetchedTheLastMessage: boolean;
  private lastMessageId: string | null;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    credentials: Credentials,
    pollInterval = 1000,
  ) {
    super();

    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.credentials = credentials;
    this.pollInterval = pollInterval;
    this.hasFetchedTheLastMessage = false;
    this.lastMessageId = null;

    this.setupGmailClient();
    this.listenForNewMessages();
  }

  private setupGmailClient() {
    const oAuth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
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
      console.log(messageId);
      if (this.hasFetchedTheLastMessage && messageId && messageId !== this.lastMessageId) {
        const message = await this.getMessage(messageId);
        this.emit('message', message);
      }

      this.lastMessageId = messageId;
      this.hasFetchedTheLastMessage = true;
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

    const fromHeader = payload.headers.find((header) => header.name === 'From');
    if (!fromHeader) {
      throw new Error('Missing `From` header!');
    }

    return {
      sender: fromHeader.value,
      body: this.decodeBase64(part.body.data),
    };
  }

  private decodeBase64(encodedString: string) {
    return (Buffer.from(encodedString, 'base64')).toString();
  }
}

export default GmailListener;
