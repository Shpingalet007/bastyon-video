import { Job } from 'bull'
import { TranscodeOptionsType } from '@server/helpers/ffmpeg-utils'
import { addTranscodingJob, getTranscodingJobPriority } from '@server/lib/video'
import { VideoPathManager } from '@server/lib/video-path-manager'
import { moveToNextState } from '@server/lib/video-state'
import { UserModel } from '@server/models/user/user'
import { VideoJobInfoModel } from '@server/models/video/video-job-info'
import { MUser, MUserId, MVideo, MVideoFullLight, MVideoWithFile } from '@server/types/models'
import {
  HLSTranscodingPayload,
  MergeAudioTranscodingPayload,
  NewResolutionTranscodingPayload,
  OptimizeTranscodingPayload,
  VideoTranscodingPayload
} from '../../../../shared'
import { retryTransactionWrapper } from '../../../helpers/database-utils'
import { computeResolutionsToTranscode } from '../../../helpers/ffprobe-utils'
import { logger, loggerTagsFactory } from '../../../helpers/logger'
import { CONFIG } from '../../../initializers/config'
import { VideoModel } from '../../../models/video/video'
import {
  generateHlsPlaylistResolution,
  mergeAudioVideofile,
  optimizeOriginalVideofile,
  transcodeNewWebTorrentResolution
} from '../../transcoding/video-transcoding'
import { MAX_ALLOWED_RESOLUTION } from '../../../initializers/constants'

type HandlerFunction = (job: Job, payload: VideoTranscodingPayload, video: MVideoFullLight, user: MUser) => Promise<void>

const handlers: { [ id in VideoTranscodingPayload['type'] ]: HandlerFunction } = {
  'new-resolution-to-hls': handleHLSJob,
  'new-resolution-to-webtorrent': handleNewWebTorrentResolutionJob,
  'merge-audio-to-webtorrent': handleWebTorrentMergeAudioJob,
  'optimize-to-webtorrent': handleWebTorrentOptimizeJob,
  'load-resolutions-container': loadResolutionsContainer
}

const lTags = loggerTagsFactory('transcoding')

async function processVideoTranscoding (job: Job) {
  const payload = job.data as VideoTranscodingPayload
  logger.info('Processing transcoding job %d.', job.id, lTags(payload.videoUUID))

  const video = await VideoModel.loadAndPopulateAccountAndServerAndTags(payload.videoUUID)
  // No video, maybe deleted?
  if (!video) {
    logger.info('Do not process job %d, video does not exist.', job.id, lTags(payload.videoUUID))
    return undefined
  }

  const user = await UserModel.loadByChannelActorId(video.VideoChannel.actorId)

  const handler = handlers[payload.type]

  if (!handler) {
    throw new Error('Cannot find transcoding handler for ' + payload.type)
  }

  await handler(job, payload, video, user)

  return video
}

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------

async function handleHLSJob (job: Job, payload: HLSTranscodingPayload, video: MVideoFullLight, user: MUser) {
  logger.info('Handling HLS transcoding job for %s.', video.uuid, lTags(video.uuid))

  const videoFileInput = payload.copyCodecs
    ? (video.getWebTorrentFile(payload.resolution) || video.getMaxQualityFile())
    : video.getMaxQualityFile()

  const videoOrStreamingPlaylist = videoFileInput.getVideoOrStreamingPlaylist()

  await VideoPathManager.Instance.makeAvailableVideoFile(videoOrStreamingPlaylist, videoFileInput, videoInputPath => {
    return generateHlsPlaylistResolution({
      video,
      videoInputPath,
      resolution: payload.resolution,
      copyCodecs: payload.copyCodecs,
      isPortraitMode: payload.isPortraitMode || false,
      job
    })
  })

  logger.info('HLS transcoding job for %s ended.', video.uuid, lTags(video.uuid))

  await retryTransactionWrapper(onHlsPlaylistGeneration, video, user, payload)
}

async function handleNewWebTorrentResolutionJob (
  job: Job,
  payload: NewResolutionTranscodingPayload,
  video: MVideoFullLight,
  user: MUserId
) {
  logger.info('Handling WebTorrent transcoding job for %s.', video.uuid, lTags(video.uuid))

  await transcodeNewWebTorrentResolution(video, payload.resolution, payload.isPortraitMode || false, job)

  logger.info('WebTorrent transcoding job for %s ended.', video.uuid, lTags(video.uuid))

  await retryTransactionWrapper(onNewWebTorrentFileResolution, video, user, payload)
}

async function handleWebTorrentMergeAudioJob (job: Job, payload: MergeAudioTranscodingPayload, video: MVideoFullLight, user: MUserId) {
  logger.info('Handling merge audio transcoding job for %s.', video.uuid, lTags(video.uuid))

  await mergeAudioVideofile(video, payload.resolution, job)

  logger.info('Merge audio transcoding job for %s ended.', video.uuid, lTags(video.uuid))

  await retryTransactionWrapper(onVideoFileOptimizer, video, payload, 'video', user)
}

async function handleWebTorrentOptimizeJob (job: Job, payload: OptimizeTranscodingPayload, video: MVideoFullLight, user: MUserId) {
  logger.info('Handling optimize transcoding job for %s.', video.uuid, lTags(video.uuid))

  const { transcodeType } = await optimizeOriginalVideofile(video, video.getMaxQualityFile(), job)

  logger.info('Optimize transcoding job for %s ended.', video.uuid, lTags(video.uuid))

  await retryTransactionWrapper(onVideoFileOptimizer, video, payload, transcodeType, user)
}

async function loadResolutionsContainer (job: Job, payload: OptimizeTranscodingPayload, video: MVideoFullLight, user: MUserId) {
  logger.info('Handling container upload for %s.', video.uuid, lTags(video.uuid))
  await console.log('')
}

// ---------------------------------------------------------------------------

async function onHlsPlaylistGeneration (video: MVideoFullLight, user: MUser, payload: HLSTranscodingPayload) {
  if (payload.isMaxQuality && CONFIG.TRANSCODING.WEBTORRENT.ENABLED === false) {
    // Remove webtorrent files if not enabled
    for (const file of video.VideoFiles) {
      await video.removeFileAndTorrent(file)
      await file.destroy()
    }

    video.VideoFiles = []

    // Create HLS new resolution jobs
    await createLowerResolutionsJobs({
      video,
      user,
      videoFileResolution: payload.resolution,
      isPortraitMode: payload.isPortraitMode,
      isNewVideo: payload.isNewVideo ?? true,
      type: 'hls'
    })
  }

  await VideoJobInfoModel.decrease(video.uuid, 'pendingTranscode')
  await moveToNextState(video, payload.isNewVideo)
}

async function onVideoFileOptimizer (
  videoArg: MVideoWithFile,
  payload: OptimizeTranscodingPayload | MergeAudioTranscodingPayload,
  transcodeType: TranscodeOptionsType,
  user: MUserId
) {
  const { resolution, isPortraitMode } = await videoArg.getMaxQualityResolution()

  // Maybe the video changed in database, refresh it
  const videoDatabase = await VideoModel.loadAndPopulateAccountAndServerAndTags(videoArg.uuid)
  // Video does not exist anymore
  if (!videoDatabase) return undefined

  // Generate HLS version of the original file with max resolution
  const originalFileHLSPayload = {
    ...payload,

    isPortraitMode,
    resolution:
        videoDatabase.getMaxQualityFile().resolution > MAX_ALLOWED_RESOLUTION
          ? MAX_ALLOWED_RESOLUTION
          : videoDatabase.getMaxQualityFile().resolution,
    // If we quick transcoded original file, force transcoding for HLS to avoid some weird playback issues
    copyCodecs: transcodeType !== 'quick-transcode',
    isMaxQuality: true
  }
  const hasHls = await createHlsJobIfEnabled(user, originalFileHLSPayload)
  const hasNewResolutions = await createLowerResolutionsJobs({
    video: videoDatabase,
    user,
    videoFileResolution: resolution,
    isPortraitMode,
    type: 'webtorrent',
    isNewVideo: payload.isNewVideo ?? true
  })

  await VideoJobInfoModel.decrease(videoDatabase.uuid, 'pendingTranscode')

  // Move to next state if there are no other resolutions to generate
  if (!hasHls && !hasNewResolutions) {
    await moveToNextState(videoDatabase, payload.isNewVideo)
  }
}

async function onNewWebTorrentFileResolution (
  video: MVideo,
  user: MUserId,
  payload: NewResolutionTranscodingPayload | MergeAudioTranscodingPayload
) {
  await createHlsJobIfEnabled(user, { ...payload, copyCodecs: true, isMaxQuality: false })
  await VideoJobInfoModel.decrease(video.uuid, 'pendingTranscode')

  await moveToNextState(video, payload.isNewVideo)
}

async function createHlsJobIfEnabled (user: MUserId, payload: {
  videoUUID: string
  resolution: number
  isPortraitMode?: boolean
  copyCodecs: boolean
  isMaxQuality: boolean
  isNewVideo?: boolean
}) {
  if (!payload || CONFIG.TRANSCODING.ENABLED !== true || CONFIG.TRANSCODING.HLS.ENABLED !== true) return false

  const jobOptions = {
    priority: await getTranscodingJobPriority(user)
  }

  const hlsTranscodingPayload: HLSTranscodingPayload = {
    type: 'new-resolution-to-hls',
    videoUUID: payload.videoUUID,
    resolution: payload.resolution,
    isPortraitMode: payload.isPortraitMode,
    copyCodecs: payload.copyCodecs,
    isMaxQuality: payload.isMaxQuality,
    isNewVideo: payload.isNewVideo
  }

  await addTranscodingJob(hlsTranscodingPayload, jobOptions)

  return true
}

// ---------------------------------------------------------------------------

export {
  processVideoTranscoding,
  createHlsJobIfEnabled,
  onNewWebTorrentFileResolution
}

// ---------------------------------------------------------------------------

async function createLowerResolutionsJobs (options: {
  video: MVideoFullLight
  user: MUserId
  videoFileResolution: number
  isPortraitMode: boolean
  isNewVideo: boolean
  type: 'hls' | 'webtorrent'
}) {
  const { video, user, videoFileResolution, isPortraitMode, isNewVideo, type } = options

  // Create transcoding jobs if there are enabled resolutions
  const resolutionsEnabled = computeResolutionsToTranscode(videoFileResolution, 'vod')
  const resolutionCreated: string[] = []

  for (const resolution of resolutionsEnabled) {
    let dataInput: VideoTranscodingPayload

    if (CONFIG.TRANSCODING.WEBTORRENT.ENABLED && type === 'webtorrent') {
      // WebTorrent will create subsequent HLS job
      dataInput = {
        type: 'new-resolution-to-webtorrent',
        videoUUID: video.uuid,
        resolution,
        isPortraitMode,
        isNewVideo
      }

      resolutionCreated.push('webtorrent-' + resolution)
    }

    if (CONFIG.TRANSCODING.HLS.ENABLED && type === 'hls') {
      dataInput = {
        type: 'new-resolution-to-hls',
        videoUUID: video.uuid,
        resolution,
        isPortraitMode,
        copyCodecs: false,
        isMaxQuality: false,
        isNewVideo
      }

      resolutionCreated.push('hls-' + resolution)
    }

    if (!dataInput) continue

    const jobOptions = {
      priority: await getTranscodingJobPriority(user)
    }

    await addTranscodingJob(dataInput, jobOptions)
  }

  if (resolutionCreated.length === 0) {
    logger.info('No transcoding jobs created for video %s (no resolutions).', video.uuid, lTags(video.uuid))

    return false
  }

  logger.info(
    'New resolutions %s transcoding jobs created for video %s and origin file resolution of %d.', type, video.uuid, videoFileResolution,
    { resolutionCreated, ...lTags(video.uuid) }
  )

  return true
}
