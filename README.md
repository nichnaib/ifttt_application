# Description

Web Application that emulates an IFTTT applet. This applet let you upload an image on a Google Drive folder and tweets it only if it does not contains sensitive data.


## Usage

1. Create project on [IFTTT platform](https://platform.ifttt.com/) and create a service, this will give you an IFTTT key to connect the service to the server.
2. Create project on [Twitter](https://developer.twitter.com/en) and create an API key.
3. Create project on [Google cloud](https://cloud.google.com/), add API Drive and API Vision to the library of API. Create an API key for both the services.
4. Host a server to the web with [ngrok](https://ngrok.com/).
5. Clone the repo and launch the server. 
```
git clone https://github.com/nichnaib/ifttt_application.git 
node server.js
```
Connect the API keys with the server. For doing so create a file for each API keys and import it in the server.


