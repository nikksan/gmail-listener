# Gmail Listener

Gmail Listener is a push client for close to real-time email subscription.

## Installation

You must first generate the credentials.json file from google and then run the quick-start script. After you generate token.json you can use them to configure the client.

```bash
npm run quick-start
```


## Usage


```javascript
const gmailListener = new GmailListener(
  {
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    redirectUri: 'redirectUri',
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
