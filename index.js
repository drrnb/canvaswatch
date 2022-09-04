/**
 * CanvasWatch
 * Discord Bot for Canvas courses.
 * by drrn / https://drrn.dev | github.com/drrnb/canvaswatch
 * MIT license
 */

const { Client, GatewayIntentBits, ActivityType, EmbedBuilder } = require('discord.js');
const { discordBotToken, canvasToken, canvasCourseURL, canvasCourseId } = require('./config.json');
const fs = require('fs');
const fetch = require('node-fetch');
const { convert } = require('html-to-text');

// How long to wait before checking for more Canvas assignments and announcements (default is 5)
// Best to keep this as high as possible to avoid potential rate limiting and throttles on the key.
const timerCheckMinutes = 5;

let announcementsData = {};
let assignmentsData = {};
let courseMeta = {};

// Config files
const channelsConfigFile = "channelsConfig.json";
let channelsConfig = {};

// Canvas API Endpoints
const canvasAPI = `https://${canvasCourseURL}/api/v1`;
const announcementsEndpoint = `${canvasAPI}/announcements?context_codes[]=course_${canvasCourseId}&access_token=${canvasToken}`;
const assignmentsEndpoint = `${canvasAPI}/courses/${canvasCourseId}/assignments?access_token=${canvasToken}`;
const courseEndpoint = `${canvasAPI}/courses/${canvasCourseId}?enrollment_state=active&access_token=${canvasToken}`;
const brandingEndpoint = `${canvasAPI}/brand_variables`;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Runs once, when the bot is ready
client.once('ready', async () => {
	console.log('CanvasWatch is connected to Discord!');

    // Read the channels configuration file
    fs.readFile(channelsConfigFile, (err, data) => {
        if (err) throw err;
        channelsConfig = JSON.parse(data);
    });

    // Get the course meta information
    await getCourseMetadata()
    .then(data => {
        // Save the course metadata
        courseMeta = data;
        // Set the discord presence information based on the course data
        client.user.setActivity(data.name, { type: ActivityType.Watching }),
        client.user.setPresence({ activities: [{ name: data.name, type: ActivityType.Watching }] })
        console.log("Done!")
    })
    .catch((err) => {
        // Set the discord presence information to a default
        console.warn("Metadata error: " + err);
        client.user.setActivity('for Canvas updates', { type: ActivityType.Watching }),
        client.user.setPresence({ activities: [{ name: 'for Canvas updates', type: ActivityType.Watching }] })
    })
    .then(() =>{
        // Check every X minutes
        runCanvasCheckTimer();
        console.log(`Listening for changes every ${timerCheckMinutes} minutes...`);
        setInterval(runCanvasCheckTimer, timerCheckMinutes * 60000);
    })
});

// Listen for slash commands
client.on('interactionCreate', async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const { commandName } = interaction;
    let channel;
    let channelId;
    let channelName;
    let prettyCommandName;

    // If slash command is for setting up a channel
    if(interaction.options.getChannel("channel")){
        channel = interaction.options.getChannel("channel");
        channelId = channel.id;
        channelName = channel.name;
        prettyCommandName = commandName.replace("-channel", "");
    }else{
        // Slash command was for fetching
        prettyCommandName = commandName.replace("-fetch", "");
    }
    
    // Assignments
	if (commandName === 'assignments-channel') {
        if(channelsConfig.assignmentsChannel === channelId){
            await interaction.reply(`**${prettyCommandName}** is already set to <#${channelId}>!`);
            return;
        }
        channelsConfig.assignmentsChannel = channelId;
	}
    else if (commandName === 'assignments-fetch') {

        if(!channelsConfig.assignmentsChannel){
            await interaction.reply(`You need to setup a channel to post the ${prettyCommandName} to first! Use **/${prettyCommandName}-channel** to do so.`);
            return;
        }

        postAllAssignments()
        .then(async () => {
            runCanvasCheckTimer();
            await interaction.reply(`Assignments have been posted in <#${channelsConfig.assignmentsChannel}>. I will check for any new assignments every 10 minutes and post them if found.`);
        })
        .catch(async (error) => {
            console.error(error);
            await interaction.reply(`There was an error with posting the ${prettyCommandName}. Please check the console log!`);
        });
	}

    // Announcements
    else if (commandName === 'announcements-channel') {
        if(channelsConfig.announcementsChannel === channelId){
            await interaction.reply(`**${prettyCommandName}** is already set to <#${channelId}>!`);
            return;
        }
		channelsConfig.announcementsChannel = channelId;
	}
    else if (commandName === 'announcements-fetch') {

        if(!channelsConfig.announcementsChannel){
            await interaction.reply(`You need to setup a channel to post the ${prettyCommandName} to first! Use **/${prettyCommandName}-channel** to do so.`);
            return;
        }

        postAllAnnouncements()
        .then(async () => {
            runCanvasCheckTimer();
            await interaction.reply(`Announcements have been posted in <#${channelsConfig.announcementsChannel}>. I will check for any new announcements every 5 minutes and post them if found.`);
        })
        .catch(async (error) => {
            console.error(error);
            await interaction.reply(`There was an error with posting the ${prettyCommandName}. Please check the console log!`);
        });
	}

    // Save the data back to the config file
    if(commandName.includes("-channel")){
        const channelConfigData = JSON.stringify(channelsConfig, null, 2);
        fs.writeFile(channelsConfigFile, channelConfigData, async (err) => {
            if (err) {
                await interaction.reply(`**Oh no!** A bot error occured: ${err}`);
                return;
            };
            await interaction.reply(`**${prettyCommandName}** set to channel <#${channelId}>`);
        });
    }
});


/**
 * Listens for announcement and assignment updates from Canvas, checks every X minutes
 */
async function runCanvasCheckTimer(){
    
    if (channelsConfig.assignmentsChannel === "" &&
        channelsConfig.announcementsChannel === ""){
        return;
    }

    // For each valid channel, listen and run every X minutes
    if(channelsConfig.announcementsChannel != ""){
        await postAllAnnouncements();
    }

    if(channelsConfig.assignmentsChannel != ""){
        await postAllAssignments();
    }
}

/**
 * Retrieves course metadata and stores it
 */
async function getCourseMetadata(){
    console.log(`Fetching course information for course ID ${canvasCourseId}. Please wait...`);
    const metaRes = await fetch(`${courseEndpoint}`);
    const metaJson = await metaRes.json();

    // Get the branding information and add it to the metadata
    const brandingRes = await fetch(`${brandingEndpoint}`)
    const brandingJson = await brandingRes.json();

    const resultingData = { ...metaJson, ...brandingJson };
    return resultingData;
}

/**
 *  Gets all of the announcements from Canvas
 * @returns Announcement data JSON
 */
async function getAllAnnouncements(){
    const res = await fetch(`${announcementsEndpoint}`);
    const json = await res.json();
    announcementsData = json;
    return announcementsData;
}

/**
 *  Gets all of the assignments from Canvas
 * @returns Assignment data JSON
 */
 async function getAllAssignments(){
    const res = await fetch(`${assignmentsEndpoint}`);
    const json = await res.json();
    assignmentsData = json;
    return assignmentsData;
}

/**
 * Posts all of the announcements to a channel
 */
async function postAllAnnouncements(){
    getAllAnnouncements().then(async data => {
        // For each announcement, post it
        for (const key in data){
            if(data.hasOwnProperty(key)){
                const post = data[key];
                await announcementPostAlreadyExists(post)
                .then(result => {
                    // If message is already posted, don't post it again
                    if(!result){
                        postAnnouncement(post);
                    }
                })
            }
          }
    })
    .catch(error => {
        console.error(error);
    })
}

/**
 * Posts all of the assignments to a channel
 */
async function postAllAssignments(){
    getAllAssignments().then(async data => {
        // For each assignment post it
        for (const key in data){
            if(data.hasOwnProperty(key)){
                const post = data[key];
                await assignmentPostAlreadyExists(post)
                .then(result => {
                    // If message is already posted, don't post it again
                    if(!result){
                        postAssignment(post);
                    }
                })
            }
          }
    })
    .catch(error => {
        console.error(error);
    })
}

/**
 *  Check existing messages to prevent duplicates
 * @param {*} content 
 */
async function announcementPostAlreadyExists(post){

    // Check against the post URL
    const post_url = post['url'];

    const channel = client.channels.cache.get(channelsConfig.announcementsChannel);

    // If no messages, return
    if (channel === undefined || channel.messages.lastMessageId === null){
        console.warn("No channel messages or channel doesn't exist. Doing no checks.");
        return true;
    }

    let isDuplicateMessage = false;

    await channel.messages.fetch({ limit: 100 })
    .then(async messages => {
        messages.forEach(message => {
            // If message matches, return true
            const embeddedMessageUrl = message.embeds[0].url;
            if(post_url === embeddedMessageUrl){
                isDuplicateMessage = true;
            }
        })
    });
    return isDuplicateMessage;
}

/**
 *  Check existing messages to prevent duplicates
 * @param {*} content 
 */
 async function assignmentPostAlreadyExists(post){

    // Check against the post URL
    const post_url = post['html_url'];

    const channel = client.channels.cache.get(channelsConfig.assignmentsChannel);

    // If no messages, return
    if (channel === undefined || channel.messages.lastMessageId === null){
        console.warn("No channel messages or channel doesn't exist. Doing no checks.");
        return true;
    }

    let isDuplicateMessage = false;

    await channel.messages.fetch({ limit: 100 })
    .then(async messages => {
        messages.forEach(message => {
            // If message matches, return true
            const embeddedMessageUrl = message.embeds[0].url;
            if(post_url === embeddedMessageUrl){
                isDuplicateMessage = true;
            }
        })
    });
    return isDuplicateMessage;
}

/**
 * Posts an assignment to the chat channel
 * @param {*} post 
 */
async function postAssignment(post){
    const title = post['name'];
    const url = post['html_url'];
    const points = post['points_possible'];
    const dueDate = new Date(post['due_at']).toLocaleDateString('en-US');
    const isQuiz = post['is_quiz_assignment'];
    const affectsFinalGrade = !post['omit_from_final_grade'];

    const brandColour = courseMeta['ic-brand-primary'];

    // Calculate the allowed attempts
    let allowedAttempts;
    post['allowed_attempts'] === -1 ? allowedAttempts = "Unlimited" : allowedAttempts = post['allowed_attempts'];

    // Build the embed
    const assignment = new EmbedBuilder()
    .setColor(brandColour)
    .setTitle(title)
    .setDescription(`${courseMeta.name}\n(${courseMeta.course_code})`)
    .setURL(url)
    .setThumbnail(courseMeta['ic-brand-header-image'])
    .addFields(
		{ name: 'Due Date', value: `${dueDate}`, inline: true},
        { name: 'Allowed Attempts', value: `${allowedAttempts}`, inline: true},
        { name: 'Total Points', value: `${points}`, inline: true},
        { name: 'Is A Quiz', value: `${isQuiz}`, inline: true},
        { name: 'Affects Final Grade', value: `${affectsFinalGrade}`, inline: true},
	)

    // Post the message
    client.channels.cache.get(channelsConfig.assignmentsChannel).send({ embeds: [assignment] });
}

/**
 * Posts an announcement to the chat channel
 * @param {*} post 
 */
async function postAnnouncement(post){
    const title = post['title'];
    const author = post['author']['display_name'];
    const author_image = post['author']['avatar_image_url'];
    const author_url = post['author']['html_url'];
    const time = post['last_reply_at'];
    const url = post['url'];

    const brandColour = courseMeta['ic-brand-primary'];

    // Remove HTML elements from the message
    const message = convert(post['message'], {});

    // Build the announcement embed
    const announcement = new EmbedBuilder()
    .setColor(brandColour)
    .setTitle(title)
    .setURL(url)
    .setAuthor({ name: author, iconURL: author_image, url: author_url })
    .setDescription(`${message}\n\n${courseMeta.name}\n(${courseMeta.course_code})`)
    .setTimestamp(Date.parse(time))
    .setThumbnail(courseMeta['ic-brand-header-image'])

    // Post the message
    client.channels.cache.get(channelsConfig.announcementsChannel).send({ embeds: [announcement] });
}

// Login to Discord with the client token
client.login(discordBotToken);