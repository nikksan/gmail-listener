/// <reference types="node" />
import { EventEmitter } from 'events';
declare type Credentials = {
    accessToken: string;
    refreshToken: string;
    scope: string;
    tokenType: string;
    expiryDate: number;
};
declare class GmailListener extends EventEmitter {
    private clientId;
    private clientSecret;
    private redirectUri;
    private credentials;
    private pollInterval;
    private gmail;
    private hasFetchedTheLastMessage;
    private lastMessageId;
    constructor(clientId: string, clientSecret: string, redirectUri: string, credentials: Credentials, pollInterval?: number);
    private setupGmailClient;
    private listenForNewMessages;
    private getLastMessageId;
    private getMessage;
    private extractMessageFromPayload;
    private decodeBase64;
}
export default GmailListener;
