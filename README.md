# securecorder
securecorder is a lightweight, browser-based, and cross-platform screen recorder designed with privacy in mind. It allows you to effortlessly record your screen directly from your browser.

## Getting started
You can use the demo [here](link) or clone the repository and open securerecorder.html in your browser:
```
git clone https://github.com/simbahax/securecorder
# change chromium acc. to your needs (or just open a browser and copy the path into the address bar)
chromium file:///path/to/repo/securecorder.html
```

Just hit the `START` button and select the window you want to share.
You can also pause the recording and resume it later.
Optionally, you can specify the mime type for the resulting video.

## Why?
I found no lightweight, easy-to-handle tool to capture your screen under Wayland.
While (temporarily) switching back to X11 is always possible, it is also very inconvenient.
Other browser-based tools I tested where rather old or did lack some functionality.

## How does it work?
screenrecorder uses the screen capture functionality of your browser, the so-called [MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API).
This should work on any platform with a decent browser without the need to install any additional software.  
screenrecorder was designed with privacy in mind and does not transmit any of your data, the recording always stays where it belongs: on your computer.
You can verify this by checking the source code on [Github](https://github.com/simbahax/securecorder).
securecorder only records your screen and stores the recording on your computer, nothing else.

## Platform support
Currently tested:
 - Firefox/Linux
 - Chromium/Linux

Please let me know if you run into any issues on other platforms.
I would also be happy to hear if securecorder works on your platform and add it to this list.

## Contrib
Pull requests welcome! :)
