# gmail-listener
A client providing an EventEmitter-like interface for new emails from GMAIL

```javascript
const gmailListener = new GmailListener(
  'clientId',
  'clientSecret',
  'redirectUri',
  {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    scope: 'scope',
    tokenType: 'tokenType',
    expiryDate: 1
  }
);

gmailListener
  .on('message', console.log)
  .on('error', console.error);
```
