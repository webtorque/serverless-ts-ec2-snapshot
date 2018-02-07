import {Handler, Context, Callback} from 'aws-lambda'
import { EC2 } from 'aws-sdk'
import { getVolumes, creatSnapshot, Volume } from '../Volume'
import { sendNotification, sendFailure } from '../Notification'

/**
 * Entry point for the app.
 */
export const handler:Handler = (event: any, context: Context, callback: Callback) => {
    // Get a list of volumes
    const volumes = getVolumes()

    // Fire off snap shot request for all the volumes
    const promises: Promise<boolean>[] = volumes.map((v) =>
        creatSnapshot(v)
        .then(notifyOfSnapshot)
        .catch((error) => notifyOfError(error, v)))

    // Group all the request together
    Promise.all(promises).then((output: boolean[]) => {
        // Count the failure and success
        const success = output.filter(val => val).length
        const failed = output.filter(val => !val).length

        // Send a notification to Stride.
        return sendNotification(success, failed)

    }).then(_ => callback(null, 'done'))

}
/**
 * When a Snapshot request is succesfully, return true.
 * @param snapshot
 */
const notifyOfSnapshot = (snapshot: EC2.Types.Snapshot): Promise<boolean> => {
    return Promise.resolve(true)
}

/**
 * Send a message about a specific failure and return false.
 * @param  error
 * @param  v
 */
const notifyOfError = (error, v: Volume): Promise<boolean> => {
    return sendFailure(v, error.message, error.code).then(_ => false)
}
