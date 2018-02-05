import {Handler, Context, Callback} from 'aws-lambda'
import { EC2, Request, config } from 'aws-sdk'

/**
 * Information necessary for creating a volume snapshot
 * @param  volumeJson [description]
 * @return            [description]
 */
export interface Volume {
    id: string,
    name: string,
    region: string
}

/**
 * Read the volume data from the environement variables.
 * @return Volume[]
 * @return Volume[]
 */
export const getVolumes = (volumeJson: string = process.env.VOLUME_IDS) => {
    const volumes: Volume[] = JSON.parse(volumeJson)
    return completeData(volumes)
}

/**
 * Make sure sensible default are specified for the volume list
 * @param  Volume[] volumes
 * @return Volume[]
 */
export const completeData = (volumes: Volume[]) => volumes.map((v) => ({
    id: v.id,
    name: v.name ? v.name : v.id,
    region: v.region ? v.region : config.region
}))

export const creatSnapshot = (volume: Volume): Promise<EC2.Types.Snapshot> => {
    // Build the snapshot request
    const param:EC2.CreateSnapshotRequest = {
        Description: `Daily Back up for ${volume.name}`,
        VolumeId: volume.id,
    }

    // Update region if need be
    if (config.region != volume.region) {
        config.update({region: volume.region})
    }

    // Fire off snap shot Creation request
    const ec2 = new EC2()
    return ec2.createSnapshot(param).promise()
}
