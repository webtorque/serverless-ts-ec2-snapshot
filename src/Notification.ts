import { Document, marks } from 'adf-builder'
import * as rq from 'request-promise'
import { Volume } from './Volume'

export const sendNotification = (completed: number, failed: number) => {
    const doc = new Document()

    const card = doc.applicationCard('AWS Daily Volume Snapshot')
        .link('https://ap-southeast-2.console.aws.amazon.com/ec2/v2/home?region=ap-southeast-2#Snapshots:sort=snapshotId')
    card.detail()
            .badge({value: completed, appearance: "primary"})
            .lozenge({appearance: 'inprogress', text: "Success"})
    if (failed > 0) {
        card.detail()
                .badge({value: failed, appearance: "important"})
                .lozenge({appearance: 'removed', text: "Failed"})
    }

    return send(doc)
}

export const sendFailure = (volume: Volume, message: string, code:string) => {
    const doc = new Document()

    doc.applicationCard(`AWS Daily Volume Snapshot for ${volume.name} failed!!!`)
        .link(`https://${volume.region}.console.aws.amazon.com/ec2/v2/home?region=${volume.region}#Snapshots:sort=snapshotId;volumeId=${volume.id}`)
        .description(`${message} (${code})`)
    // doc.paragraph().mention('557058:ee5982b7-63a1-4fe1-a666-80d913158344', 'Max')

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
 * @return [description]
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
 * Given a list of user in the room, return a list links to retrieve their full user profile.
 * @param  jsonStr
 */
const readLinkFromUserList = (jsonStr: string): Promise<string[]> => {
    const json = JSON.parse(jsonStr)
    const userIds: string[] = json.values
    const links: string[] = userIds.map(id => json._links[id])

    return Promise.resolve(links)
}

/**
 * Given a list of user profile links, fetch all their detail profile
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
