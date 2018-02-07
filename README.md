# Automated EC2 Volumne Snap shot with Serverless
This simple project will create a Lambda function that will trigger snapshots for EC2 volumes on a daily basis. Once the snapshots have been triggered, it will post a notification to a Atalasian Stride Room.

The project is built in TypeScript and uses Serverless for deployment.

*This is not meant to be a be-all-end-all solution. It's tailored to our specific use case. Tweak it for your own need.*

# Before your start
This projects assumes you're already familiar with how to use the Serverless Framework. The Serverless Framework is the world’s leading development framework for building serverless architectures.

[Learn more about the Serverless Framework](https://serverless.com)

# Getting the project working

0. [Set up Serverless to work](https://serverless.com/framework/docs/providers/aws/guide/quick-start/) and Typescript if you don't have them already.
1. Clone this repo on your sytem: `git clone https://github.com/syrp-nz/serverless-ts-lambda-handler-sample.git`
2. Install your dependencies: `npm install`.
3. Create a `env-prod.yml` file by copying the env.sample.yml and editing the value appropriately.
4. Transpile the Typescript code to Javascript: `tsc`.
5. Test the project locally: `serverless invoke local --function AutomatedSnapshot`
6. Deploy your project: `serverless deploy --stage prod`

# Configuring your `.env-prod` file

## VOLUME_IDS
Use this key to specify which EC2 Volumne needs to be snapshot. This value needs to be a JSON-encoded string using the following format:
```json
[
    {
        "id": "vol-1234567",
        "name": "Some human friendly name", // Defaults to volume id if not specified
        "region": "ap-southeast-2" // Defaults to the lambda functions region
    },
    ...
]
```

## Stride settings
When the snapshots have been initiated, the Lambda function will send a notification to a Stride room. When a snapshot fails it will fire off a message to the same room with a mention to every single user who is part of the room.

To get this part working you need to provide the following value in your `.env-prod` file.
```yml
#
STRIDE_SITE_ID: b0af5248-e881-4cc6-886b-85d100394065
STRIDE_ROOM_ID: 5c7c3531-6039-4ba6-b702-52a0af1584a1

STRIDE_TOKEN: SUPERSECRETTOKEN
```

To get those values:
1. Open the room in stride.
1. In the right-hand pane, click the Apps icon.
1. Click the + sign to create a new app.
1. Select _Connect your own app_.
1. In the pop up, make sure you select _API tokens_.
1. Name your app and generate your token.

You will receive a conversation URL and a token. The token can be put directly in your `.env` file. You can extract the site ID and room ID from the conversation URL:
* The part after `site` is your site ID.
* The part after `conversation` is your room ID.
