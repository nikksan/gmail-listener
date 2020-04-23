"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const googleapis_1 = require("googleapis");
const events_1 = require("events");
class GmailListener extends events_1.EventEmitter {
    constructor(clientId, clientSecret, redirectUri, credentials, pollInterval = 1000) {
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
    setupGmailClient() {
        const oAuth2Client = new googleapis_1.google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri);
        oAuth2Client.setCredentials({
            access_token: this.credentials.accessToken,
            refresh_token: this.credentials.refreshToken,
            expiry_date: this.credentials.expiryDate,
            token_type: this.credentials.tokenType,
        });
        this.gmail = googleapis_1.google.gmail({ version: 'v1', auth: oAuth2Client });
    }
    listenForNewMessages() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const messageId = yield this.getLastMessageId();
                console.log(messageId);
                if (this.hasFetchedTheLastMessage && messageId && messageId !== this.lastMessageId) {
                    const message = yield this.getMessage(messageId);
                    this.emit('message', message);
                }
                this.lastMessageId = messageId;
                this.hasFetchedTheLastMessage = true;
            }
            catch (err) {
                this.emit('error', err);
                return;
            }
            setTimeout(() => this.listenForNewMessages(), this.pollInterval);
        });
    }
    getLastMessageId() {
        return new Promise((resolve, reject) => {
            this.gmail.users.messages.list({
                userId: 'me',
            }, (err, res) => {
                if (err)
                    return reject(err);
                const messageId = res.data.messages.length ? res.data.messages[0].id : null;
                resolve(messageId);
            });
        });
    }
    getMessage(id) {
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
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
    extractMessageFromPayload(payload) {
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
    decodeBase64(encodedString) {
        return (Buffer.from(encodedString, 'base64')).toString();
    }
}
exports.default = GmailListener;
