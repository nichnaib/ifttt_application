# Description

Web Application that emulates an IFTTT applet with privacy checking. This applet let you upload an image on a Google Drive folder and tweets it only if it does not contains sensitive data (cards, id and so on).

This project to be used must be hosted somewhere on the web, so your localhost will not be enough. I used a workaround at step 4 (glitch) to avoid cloning the repo and using something like ngrok for hosting it. 



## Usage

1. Create project on [IFTTT platform](https://platform.ifttt.com/) and create a service, this will give you an IFTTT key to connect the service to the server (tab API of the platform, IFTTT API URL will be the ip address of your webapp and Service Key the IFTTT key to insert into the webapp for linking). Create a new trigger (with an endpoint named get_photo) a new action (with an endpoint named social_upload) and afterwards an applet using the trigger and the action just created. PS: follow closely the indications given by IFTTT (snake_case the name of the endpoints) otherwise nothing will work.
2. Create project on [Twitter](https://developer.twitter.com/en) and create the API key for the project.
3. Create project on [Google cloud](https://cloud.google.com/), add API Drive and API Vision to the library of API (for using the API Vision you must have a credit card linked to your profile since they are not free). Create an account service for both the API, this account will let you generate the API key for both the services. Share the Google Drive folder in which you want the application to execute with the account service created for the API Drive.
4. Create an account and remix the project on [glitch](https://glitch.com/embed/#!/embed/childlike-banon?path=vision_config.json&previewSize=0). By remixing the project, all the source code on this repository will be cloned in a docker container given by Glitch with node and all the packages needed already installed and configured. It will be already up and running, you only need to connect your API keys with the server. For doing so, insert the values of the keys in the matching files (drive_config.json, vision_config.json, twitter_config.js and .env) and uncomment the imports in the server.js file.

## Testing

For testing you can use the automated IFTTT testing tool on the [IFTTT platform](https://platform.ifttt.com/), if all the test are passed you connection with IFTTT will be successfull!
