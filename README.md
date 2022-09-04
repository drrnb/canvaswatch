# CanvasWatch

## What?
A Discord bot for automatically posting [Canvas LMS](https://community.canvaslms.com/t5/Canvas/ct-p/canvas) course announcements and assignments into text channels.

![CanvasWatch Discord Screenshot](https://i.imgur.com/bYJUDvA.jpeg)

## Requirements
You'll need a few things before you can use the bot.
1. A [Discord developer account](https://discord.com/developers).
2. Somewhere to host the bot. I highly recommend [Hetzner](https://hetzner.cloud/?ref=tqgDVez81Fag). *(affiliate link)*
3. [Node JS](https://nodejs.org/en/) (>= 16.9.0)
4. Be on a Canvas course of some sort.

## Installing
1. Clone this repo or [download the zip file]() and extract it to where you intend to run it from.
2. Run `npm install` to install the required node packages.

## Creating the Discord Bot
1. Visit the [Discord developer site](https://discord.com/developers) and create a new application. Call it whatever you like.
2. On the sidebar choose "OAuth2 -> General" then set Authorization Method to "In-app Authorization".
3. Still in General, under "Scopes" tick the "bot" checkbox.
4. Under "Bot Permissions" check the following boxes: "Send Messages" and "Embed Links".
5. Click on "Bot" on the sidebar and allow it to create a bot, untick "Public" and give it a name and profile picture if you so wish.
6. Use the token button to generate a token and copy it to your clipboard.

## Configuring the Discord Bot
1. Open the file `config.json` and paste the token you just copied between the blank quotation marks to the right of "discordBotToken".
2. Go back to the Discord developer site and click on "General Information" on the sidebar.
3. Copy the "Client ID" using the button.
4. Go back to the `config.json` file and paste the client ID between the quotation marks next to "discordBotClientID".
5. Run `node deploy-commands.js` to setup the slash commands in Discord. (Note that if you add more commands you will need to add them in here and run it again, otherwise you need to just run it once during this setup.)

## Configuring Canvas
1. Go to your course Canvas page. (Something like course.instructure.com)
2. On the sidebar click on "Account"
3. Choose "Settings".
4. Scroll down to "Approved integrations" and click the "New access token" button.
5. Give it a name then click "Generate token"
6. Copy the token it created and paste it into the quotation marks in `config.json` next to "canvasToken".
7. Set "canvasCourseURL" to the main URL of the course (without any https://) eg. `course.instructure.com`
8. Set "canvasCourseId" to the course ID. This can be found in Canvas by using the sidebar to go to "Courses" and then choosing the course you wish to use and noting the characters at the end of the URL. eg, `17026` 

## Running the bot
With the settings configured you should be able to run the bot with:
`node index.js`

Once it's running invite it to your Discord server by going back to the Discord development page and choosing "URL Generator" under "OAuth 2" from the sidebar.
Select the following checkboxes: "bot", "application.commands", "Send Messages", "Embed Links" and then open the URL and invite the bot to your server.

## Setting the announcement & assignment Discord Channels
From within Discord you can use the following commands to setup the bot:   
`/announcements-channel <channel>` to set the text channel to post announcements to.  
`/assignments-channel <channel>` to set the text channel to post assignments to.  
`/announcements-fetch` to get the latest announcements.  
`/assignments-fetch` to get the latest assignments.  

Once setup the bot will check for new assignments and announcements every 5 minutes. You can change this from near the top of `index.js` if you wish.

## Bugs & Issues
There is bound to be some issues and broken things somewhere along the line, feel free to submit pull requests and issues and if I get around to it I'll take a look. I know for one that the error handling isn't perfect. Make sure you have the right bot permissions in Discord. ;)

## License
```
Copyright (c) 2022 Darren B <https://drrn.dev>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
