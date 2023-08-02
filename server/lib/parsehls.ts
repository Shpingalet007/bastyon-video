import fs from 'fs'
import path from 'path'

function parseMaster (hlsFolder) {
  const ResolutionRegexGlobal = /RESOLUTION=\d+x(\d+).*\n(.+)/g
  const ResolutionRegex = /RESOLUTION=\d+x(\d+).*\n(.+)/

  const master = fs.readFileSync(path.resolve(hlsFolder, 'master.m3u8'))
  const rawResolutions = master.toString().match(ResolutionRegexGlobal)

  const resolutions = {}
  rawResolutions.forEach(r => {
    const rMatches = r.match(ResolutionRegex)
    resolutions[rMatches[1]] = rMatches[2]
  })

  return resolutions
}

function parsePlaylists (hlsFolder, resolutionPlaylists) {
  const ByteRangeRegexGlobal = /#EXT-X-BYTERANGE:(\d+)@(\d+)\n(.*)/g
  const ByteRangeRegex = /#EXT-X-BYTERANGE:(\d+)@(\d+)\n(.*)/

  const resolutionFragments = {}

  Object.keys(resolutionPlaylists).forEach((res, i) => {
    const playlist = fs.readFileSync(resolutionPlaylists[res])

    const rawFragments = playlist.toString().match(ByteRangeRegexGlobal)
    const fragments = rawFragments.map(f => f.match(ByteRangeRegex))

    resolutionFragments[res] = {}
    resolutionFragments[res].file = path.resolve(hlsFolder, fragments[0][3])

    const bytes = fragments.map(r => ({
      length: Number.parseFloat(r[1]),
      start: Number.parseFloat(r[2])
    }))

    resolutionFragments[res].bytes = [
      { length: bytes[0].start, start: 0 },
      ...bytes
    ]
  })

  return resolutionFragments
}

export function parseHlsFolder (hlsFolder) {
  const resolutionPlaylists = parseMaster(hlsFolder)
  return parsePlaylists(hlsFolder, resolutionPlaylists)
}
