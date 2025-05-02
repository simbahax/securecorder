// Client-side, lightweight and privacy-respecting screen recorder by simbahax <https://github.com/simbahax/securecorder>
// Licensed under the MIT license. See LICENSE file in the project root for details.

const RECORDER_TIMESLICE = 500
const FILENAME_STORAGE = 'video.mp4'
const VIDEO_TYPES = {
  'video/webm': '.webm',
  'video/ogg': '.ogg',
  'video/mp4': '.mp4',
  'video/x-matroska': '.mkv'
}
const CODECS = ['should-not-be-supported', 'vp9', 'vp9.0', 'vp8', 'vp8.0', 'avc1', 'av1', 'h265', 'h.265', 'h264', 'h.264', 'opus', 'pcm', 'aac', 'mpeg', 'mp4a']
const DISPLAY_MEDIA_OPTIONS = {
  audio: { suppressLocalAudioPlayback: true },
  video: true,
  monitorTypeSurfaces: 'include',
  preferCurrentTab: false,
  selfBrowserSurface: 'exclude',
  surfaceSwitching: 'include',
  systemAudio: 'include'
}

let chunks, fileHandle, recorder, recordStart, writableStream
let size = 0

function formatBytes (bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getSupportedMimeTypes (types, codecs) {
  const supported = []

  types.forEach(function (mimeType) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      supported.push(mimeType)
    }

    codecs.forEach(function (codec) {
      [
        `${mimeType};codecs=${codec}`,
        `${mimeType};codecs=${codec.toUpperCase()}`
      ].forEach(function (variant) {
        if (MediaRecorder.isTypeSupported(variant)) {
          supported.push(variant)
        }
      })
    })
  })

  supported.sort()
  return supported
}

function initMimeOptions () {
  const mimeOptions = document.getElementById('rec_mime_options')
  const supported = getSupportedMimeTypes(Object.keys(VIDEO_TYPES), CODECS)
  supported.unshift('auto')
  supported.forEach(function (mimeType) {
    const i = document.createElement('input')
    i.type = 'radio'
    i.value = mimeType
    i.name = 'mimeType'
    if (mimeType === 'auto') i.checked = true

    const l = document.createElement('label')
    l.textContent = mimeType

    l.appendChild(i)
    mimeOptions.appendChild(l)
  })
}

function setStatus (state, sizeDelta) {
  const div = document.getElementById('status')
  const start = document.getElementById('rec_start')
  const resume = document.getElementById('rec_resume')
  const stop = document.getElementById('rec_stop')
  const pause = document.getElementById('rec_pause')
  const mimeOptions = document.getElementById('rec_mime_options')
  let duration

  if (sizeDelta) {
    size += sizeDelta
  }

  switch (state) {
    case 0:
      resetErrorHandler()
      div.textContent = 'READY'
      div.style['background-color'] = 'green'
      div.style.color = 'white'

      start.style.display = 'block'
      resume.style.display = 'none'
      stop.style.display = 'none'
      pause.style.display = 'none'
      mimeOptions.style.display = 'block'

      break
    case 1:
      duration = Math.round((performance.now() - recordStart) / 1000)

      div.textContent = `RECORDING (${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')} | ${formatBytes(size, 1)})`
      div.style['background-color'] = 'red'
      div.style.color = 'white'

      start.style.display = 'none'
      resume.style.display = 'none'
      stop.style.display = 'block'
      pause.style.display = 'block'
      mimeOptions.style.display = 'block'

      break
    case 2:
      div.textContent = 'ERROR'
      div.style['background-color'] = 'purple'
      div.style.color = 'white'

      start.style.display = 'block'
      resume.style.display = 'none'
      stop.style.display = 'none'
      pause.style.display = 'none'
      mimeOptions.style.display = 'block'

      break
    case 3:
      duration = Math.round((performance.now() - recordStart) / 1000)

      div.textContent = `PAUSED (${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(duration % 60).padStart(2, '0')} | ${formatBytes(size, 1)})`
      div.style['background-color'] = 'yellow'
      div.style.color = 'black'

      start.style.display = 'none'
      resume.style.display = 'block'
      pause.style.display = 'none'
      stop.style.display = 'block'
      mimeOptions.style.display = 'block'

      break
    default:
      throw Error('Invalid state!')
  }
}

function getSuggestedName (mimeType) {
  let ext
  try {
    if (!mimeType) {
      // probably firefox - does not support reading the mimeType from the recorder but does set the filename later on...
      ext = ''
    } else {
      ext = VIDEO_TYPES[mimeType.split(';')[0]]
    }
  } catch (e) {
    console.warn(`No file extension found for ${mimeType}!`)
    ext = '.bin'
  }

  return `${new Date().toISOString().slice(0, 16)}-capture${ext}`
}

function errorHandler (e) {
  console.error(e)

  document.getElementById('error-box').style.display = 'block'
  const err = document.getElementById('error')
  err.textContent += e.message
  err.textContent += '\n'

  setStatus(2)
}

function resetErrorHandler () {
  document.getElementById('error-box').style.display = 'none'
  document.getElementById('error').textContent = ''
}

async function startRecording (e) {
  e.preventDefault()
  console.info('Starting recording...')
  setStatus(0)

  try {
    try {
      const root = await navigator.storage.getDirectory()
      fileHandle = await root.getFileHandle(FILENAME_STORAGE, { create: true })
      writableStream = await fileHandle.createWritable()
    } catch (e) {
      // fallback in case any of the above methods is not supported
      // or a SecurityError is thrown (e.g. Firefox private mode)
      console.debug(e)
      chunks = []
    }

    const captureStream = await navigator.mediaDevices.getDisplayMedia(DISPLAY_MEDIA_OPTIONS)
    const options = {}
    const mimeTypeSelected = document.getElementById('control').mimeType.value

    if (mimeTypeSelected !== 'auto') {
      options.mimeType = mimeTypeSelected
    }
    recorder = new MediaRecorder(captureStream, options)

    recorder.ondataavailable = async function (e) {
      try {
        console.debug(`New chunk (${e.data.size} B)`)
        if (writableStream) {
          await writableStream.write(e.data)
        } else {
          chunks.push(e.data)
        }
        if (recorder.state === 'paused') {
          setStatus(3, e.data.size)
        } else {
          setStatus(1, e.data.size)
        }
      } catch (e) {
        errorHandler(e)
      }
    }

    recorder.onstop = async function () {
      console.info('Stopping recording...')
      // this is precedded by a dataavailable event, we can safely close here
      // cf. https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/stop_event:
      try {
        const download = document.createElement('a')
        download.download = getSuggestedName(recorder.mimeType)

        if (chunks instanceof Array) {
          console.debug('Generating blob from chunks...')
          download.href = URL.createObjectURL(new Blob(chunks))
        } else {
          if (writableStream) {
            console.debug('Closing file stream...')
            await writableStream.close()
          }

          if (fileHandle) {
            console.debug('Generating blob from file...')
            download.href = URL.createObjectURL(await fileHandle.getFile())
          }
        }
        download.click()
        URL.revokeObjectURL(download.href)
        size = 0
        setStatus(0)
      } catch (e) {
        errorHandler(e)
      }
    }

    recorder.onerror = function (e) {
      errorHandler(e)
      recorder.onstop()
    }

    recorder.start(RECORDER_TIMESLICE)
    recordStart = performance.now()
    setStatus(1)
  } catch (err) {
    errorHandler(err)
    stopRecording()
    window.focus()
  }
}

async function pauseRecording (e) {
  e.preventDefault()
  try {
    recorder.requestData()
    recorder.pause()
    setStatus(3)
  } catch (e) {
    errorHandler(e)
  }
}

async function resumeRecording (e) {
  e.preventDefault()
  try {
    recorder.resume()
    setStatus(1)
  } catch (e) {
    errorHandler(e)
  }
}

async function stopRecording (e) {
  if (e) {
    e.preventDefault()
  }

  if (recorder) {
    try {
      recorder.stop()
      recorder.stream.getTracks().forEach((t) => t.stop())
    } catch (e) {
      errorHandler(e)
    }
  }
}

initMimeOptions()
setStatus(0)
document.getElementById('rec_start').onclick = startRecording
document.getElementById('rec_resume').onclick = resumeRecording
document.getElementById('rec_stop').onclick = stopRecording
document.getElementById('rec_pause').onclick = pauseRecording
