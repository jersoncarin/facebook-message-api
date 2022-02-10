This repo is a fork from main repo and will usually have new features bundled faster than main repo (and maybe bundle some bugs, too).
# Facebook Message API

This API is the only way to automate chat functionalities on a user account. We do this by emulating the browser. This means doing the exact same GET/POST requests and tricking Facebook into thinking we're accessing the website normally. Because we're doing it this way, this API won't work with an auth token but requires the credentials of a Facebook account.

## Install
Install using npm:
```bash
npm install facebook-message-api
```

Install using yarn:
```bash
yarn add facebook-message-api
```

## Testing your bots
If you want to test your bots without creating another account on Facebook, you can use [Facebook Whitehat Accounts](https://www.facebook.com/whitehat/accounts/).

## Authenticate
To authenticate your account you should create .env or export it on Environment variable
Note: Please make sure that your .env is ignore on git to avoid stealing your credential or you can make your repo private.
```bash
# It can be username or email
EMAIL=markzuckerbot@facebook.com
PASS=markzuckerbot
```

## Example Usage
```javascript
const command = require("facebook-message-api");

// Initialize the chat command first
// you may passed additional options, it can be accessed into command options from the callback
command.init({ prefix: '/' });

// You can add event middleware
// Note that this will be served as global event middleware
const eventMiddleware1 = (next) => {
    return async (event,api,options) => {
        // Handle before the event is resolved
        await next(event,api,options)
        // Or handle after event has been resolved
    }
}

const eventMiddleware2 = (next) => {
    return async (event,api,options) => {
        // Handle before the event is resolved
        await next(event,api,options)
        // Or handle after event has been resolved
    }
}

command.addEventMiddleware(eventMiddleware1,eventMiddleware2)

// Also you may listen the event using on function
// Listen all incoming events using wildcards
command.on('*', (event,api,options) => {
    // handle all event here
})

// Also you can specify what event to listen, you may use | to listen multiple events
command.on('message|message_unsend',(matches,event,api,options) => {
    // handle message and message_unsend event
})

// You can also listen initialized events
command.on('init',(api,options) => {
    // handle init event here
})

// You can also listen before the scripts restarted
// Why scripts should restart? because we need to make new facebook home request inorder to get new session token, this will prevent from login state expiration.
command.on('restarting',(api,options) => {
    // handle before the script will be restarted
})

// Adding commands makes easy using chaining method.
command
  .add(async function (match, event, api) {
    // Handle inspire command here
    console.log(matche) // { category: 'value here' }
  })
  .addName('inspire')
  .addDescription('Generate motivational quotes.')
  .addAlias('ins')
  .addUsage('/inspire')
  .addPattern('^(.*)$',['category'])
  
// Adding global command middleware
const commandMiddleware1 = (next) => {
    return async (match,event,api,options) => {
        // Handle before the command is resolved
        await next(match,event,api,options)
        // Or handle after command has been resolved
    }
}

const commandMiddleware2 = (next) => {
    return async (match,event,api,options) => {
        // Handle before the command is resolved
        await next(match,event,api,options)
        // Or handle after command has been resolved
    }
}
command.addCommandMiddleware(commandMiddleware1,commandMiddleware2)
```

# Command Methods
* [`command.add(func)`](#commandAdd)
* [`command.add(func).addName(name)`](#commandAddName)
* [`command.add(func).addDescription(description)`](#commandAddDescription)
* [`command.add(func).addAlias(alias)`](#commandAddAlias)
* [`command.add(func).addUsage(usage)`](#commandAddUsage)
* [`command.add(func).addOption(option)`](#commandAddOption)
* [`command.add(func).addMiddleware(...middleware)`](#commandAddMiddleware)
* [`command.add(func).addPattern(regexPattern,?matches)`](#commandAddPattern)
* [`command.add(func).withPrefix(prefix)`](#commandWithPrefix)
* [`command.add(func).pipe(func)`](#commandPipe)

# Command API's
---------------------------------------
<a name="commandAdd"></a>
### command.add([, callback])

Add command

__Arguments__

* `callback`: A callback function, required.
---------------------------------------
<a name="commandAddName"></a>
### command.add([, callback]).addName(string name)

Add command name 

__Arguments__

* `name`: A command name, required.
---------------------------------------
<a name="commandAddName"></a>
### command.add([, callback]).addDescription(string description)

Add command Description 

__Arguments__

* `name`: A command description, optional.
---------------------------------------
<a name="commandAddAlias"></a>
### command.add([, callback]).addAlias(string alias)

Add command alias

__Arguments__

* `name`: A command alias, optional.
---------------------------------------
<a name="commandAddUsage"></a>
### command.add([, callback]).addUsage(string usage)

Add command help usage

__Arguments__

* `usage`: A command usage, optional.
---------------------------------------
<a name="commandAddOption"></a>
### command.add([, callback]).addOption({...option})

Add command option

__Arguments__

* `option`: A command option, you may pass object, optional.
---------------------------------------
<a name="commandAddMiddleware"></a>
### command.add([, callback]).addMiddleware(...middleware)

Add command middleware

__Arguments__

* `middleware`: A command middleware, you may pass args as many as you want, optional.
---------------------------------------
<a name="commandAddPattern"></a>
### command.add([, callback]).addPattern(regexPattern, matches)

Add command pattern to match the arguments of the command

__Arguments__

* `pattern`: You may pass regex pattern that matches the arguments of the command, required.
* `matches`: You can also pass matches here, example if you passed the first matches with search name, then in the command callback you can get match.search, instead of match[1]
---------------------------------------
<a name="commandWithPrefix"></a>
### command.add([, callback]).withPrefix(string prefix)

Add command prefix

__Arguments__

* `prefix`: A command prefix, It will be fallback to global prefix if this not defined, optional.
---------------------------------------
<a name="commandPipe"></a>
### command.add([, callback]).pipe([, callback])

Pipe the command instance into callback function so you can extend functionalities and other stuff

__Arguments__

* `callback`: A pipe callback which has arguments of instance of the Command class, required.
---------------------------------------
# Facebook APIs

* [`api.addUserToGroup`](#addUserToGroup)
* [`api.changeAdminStatus`](#changeAdminStatus)
* [`api.changeArchivedStatus`](#changeArchivedStatus)
* [`api.changeBlockedStatus`](#changeBlockedStatus)
* [`api.changeGroupImage`](#changeGroupImage)
* [`api.changeNickname`](#changeNickname)
* [`api.changeThreadColor`](#changeThreadColor)
* [`api.changeThreadEmoji`](#changeThreadEmoji)
* [`api.createNewGroup`](#createNewGroup)
* [`api.createPoll`](#createPoll)
* [`api.deleteMessage`](#deleteMessage)
* [`api.deleteThread`](#deleteThread)
* [`api.forwardAttachment`](#forwardAttachment)
* [`api.getAppState`](#getAppState)
* [`api.getCurrentUserID`](#getCurrentUserID)
* [`api.getEmojiUrl`](#getEmojiUrl)
* [`api.getFriendsList`](#getFriendsList)
* [`api.getThreadHistory`](#getThreadHistory)
* [`api.getThreadInfo`](#getThreadInfo)
* [`api.getThreadList`](#getThreadList)
* [`api.getThreadPictures`](#getThreadPictures)
* [`api.getUserID`](#getUserID)
* [`api.getUserInfo`](#getUserInfo)
* [`api.handleMessageRequest`](#handleMessageRequest)
* [`api.listen`](#listen)
* [`api.logout`](#logout)
* [`api.markAsDelivered`](#markAsDelivered)
* [`api.markAsRead`](#markAsRead)
* [`api.markAsReadAll`](#markAsReadAll)
* [`api.markAsSeen`](#markAsSeen)
* [`api.muteThread`](#muteThread)
* [`api.removeUserFromGroup`](#removeUserFromGroup)
* [`api.resolvePhotoUrl`](#resolvePhotoUrl)
* [`api.searchForThread`](#searchForThread)
* [`api.sendMessage`](#sendMessage)
* [`api.sendTypingIndicator`](#sendTypingIndicator)
* [`api.setMessageReaction`](#setMessageReaction)
* [`api.setOptions`](#setOptions)
* [`api.setTitle`](#setTitle)
* [`api.threadColors`](#threadColors)
* [`api.unsendMessage`](#unsendMessage)

---------------------------------------

# Documentation for Facebook API'S
See [this](https://github.com/Schmavery/facebook-chat-api/blob/master/DOCS.md) from [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api)

# Credits
[facebook-chat-api contributors](https://github.com/Schmavery/facebook-chat-api)
[puppeteer](https://github.com/puppeteer/puppeteer)

# LICENSE
```
The MIT License (MIT)

Copyright (c) 2015 Avery, Benjamin, David, Maude
Copyright (c) 2022 Jerson Carin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```


