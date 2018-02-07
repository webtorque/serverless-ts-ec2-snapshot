import { Document, marks } from 'adf-builder'
import * as rq from 'request-promise'
import { Volume } from './Volume'
import { config } from 'aws-sdk'

declare const process: any;

/**
 * Notify of snapshot to Stride.
 * @param completed Number of snapshot request that started sucessfully.
 * @param failed Number of snapshot request that failed.
 */
export const sendNotification = (completed: number, failed: number) => {
    // Initialise a new atlassian document
    const doc = new Document()

    // Create a card with a link to the snap shot in AWS
    const region = config.region
    const card = doc.applicationCard('AWS Daily Volume Snapshot')
        .link(`https://${region}.console.aws.amazon.com/ec2/v2/home?region=${region}#Snapshots:sort=snapshotId`)

    // Show a badge with the number of completed snap shot
    card.detail()
            .badge({value: completed, appearance: "primary"})
            .lozenge({appearance: 'inprogress', text: "Success"})

    // If there's a failed snapshot, add a tag for that.
    if (failed > 0) {
        card.detail()
                .badge({value: failed, appearance: "important"})
                .lozenge({appearance: 'removed', text: "Failed"})
    }

    return send(doc)
}

/**
 * Send a notification that a snap shot failed. Each failure will have an individual notification. All users in the room
 * will be mentionned to make sure people get the message.
 * @param volume Information for the volume that failed to snapshot
 * @param message The error message that triggered the warning
 * @param code The error code we got back from AWS
 */
export const sendFailure = (volume: Volume, message: string, code:string) => {
    // Initialise a new atlassian document
    const doc = new Document()

    // Card with a link to the AWS EC2 console for the specific volume ID that failed
    doc.applicationCard(`AWS Daily Volume Snapshot for ${volume.name} failed!!!`)
        .link(`https://${volume.region}.console.aws.amazon.com/ec2/v2/home?region=${volume.region}#Snapshots:sort=snapshotId;volumeId=${volume.id}`)
        .description(`${message} (${code})`)

    // Add a mention to all the user in the room, to make sure they get the message
    return mentionAllUsers(doc).then(doc => send(doc))
}

const send = (body: Document): Promise<any> => {
    const options = {
        method: 'POST',
        uri: `https://api.atlassian.com/site/${process.env.STRIDE_SITE_ID}/conversation/${process.env.STRIDE_ROOM_ID}/message`,
        body: body.toJSON(),
        json: true, // Automatically stringifies the body to JSON
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.STRIDE_TOKEN}`,
        }
    }

    return rq(options)
}

/**
 * Modify a Document so that it mentions all Users in the room.
 * @param doc Document to update
 */
const mentionAllUsers = (doc: Document): Promise<Document> => {
    return fetchAllUserInRoom()
        .then(readLinkFromUserList)
        .then(fetchDetailUserData)
        .then((users: any[]) => {
            const p = doc.paragraph()
            users.forEach(user => {
                p.mention(user.id, user.displayName)
            })
            return Promise.resolve(doc)
        })

}

/**
 * Get a list all the user in the room
 */
const fetchAllUserInRoom = (): Promise<string> => {
    const options = {
        uri: `https://api.atlassian.com/site/${process.env.STRIDE_SITE_ID}/conversation/${process.env.STRIDE_ROOM_ID}/roster`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.STRIDE_TOKEN}`,
        }
    }
    return rq(options)
}

/**
 * Given a result set from `fetchAllUserInRoom`, return a list links to retrieve their full user profile.
 * @param  jsonStr
 */
const readLinkFromUserList = (jsonStr: string): Promise<string[]> => {
    const json = JSON.parse(jsonStr)
    const userIds: string[] = json.values
    const links: string[] = userIds.map(id => json._links[id])

    return Promise.resolve(links)
}

/**
 * Given a list of user profile links, fetch all their detail profile and parse the JSON
 */
const fetchDetailUserData = (links: string[]) => {
    const promises = links.map(link => rq({
        uri: link,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.STRIDE_TOKEN}`,
        }
    }))

    return Promise.all(promises).then((jsonStrings: string[]) => {
        return jsonStrings.map(jsonStr => {
            return JSON.parse(jsonStr)
        })
    })
}
