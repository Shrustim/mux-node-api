const { createServer } = require('http');
const express = require('express');
const { parse } = require('url');
const url = require('url');

// const WebSocketServer = require('ws').Server;

const WebSocket = require('ws');
const child_process = require('child_process');

const app = express();

const PORT = 3000;

const server = createServer(app);
const wss = new WebSocket.Server({ port: 8080 });
// var wss = new WebSocket('ws://localhost:3001/rtmp');
app.listen(PORT, (error) => {

    if (!error)
        console.log("Server is Successfully Running,and App is listening on port " + PORT)
    else
        console.log("Error occurred, server can't start", error);
});



// wss.on('connection', function connection(ws) {
//     ws.on('message', function incoming(data) {
//         wss.clients.forEach(function each(client) {
//             if (client !== ws && client.readyState === WebSocket.OPEN) {
//                 client.send(data);
//                 // console.log('data', data);
//             }
//         });
//     });
// });



//initialize the WebSocket server instance

// const wss = new WebSocketServer({
//     server: server
// });

wss.on('connection', (ws, req) => {
    console.log('Streaming socket connected');
    ws.send('WELL HELLO THERE FRIEND');

    const queryString = url.parse(req.url).search;
    const params = new URLSearchParams(queryString);
    const key = params.get('key');

    const rtmpUrl = `rtmps://global-live.mux.com/app/${key}`;

    const ffmpeg = child_process.spawn('ffmpeg', [
        '-i', '-',

        // video codec config: low latency, adaptive bitrate
        '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',

        // audio codec config: sampling frequency (11025, 22050, 44100), bitrate 64 kbits
        '-c:a', 'aac', '-strict', '-2', '-ar', '44100', '-b:a', '64k',

        //force to overwrite
        '-y',

        // used for audio sync
        '-use_wallclock_as_timestamps', '1',
        '-async', '1',

        //'-filter_complex', 'aresample=44100', // resample audio to 44100Hz, needed if input is not 44100
        //'-strict', 'experimental',
        '-bufsize', '1000',
        '-f', 'flv',

        rtmpUrl
    ]);

    // Kill the WebSocket connection if ffmpeg dies.
    ffmpeg.on('close', (code, signal) => {
        console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
        ws.terminate();
    });

    // Handle STDIN pipe errors by logging to the console.
    // These errors most commonly occur when FFmpeg closes and there is still
    // data to write.f If left unhandled, the server will crash.
    ffmpeg.stdin.on('error', (e) => {
        console.log('FFmpeg STDIN Error', e);
    });

    // FFmpeg outputs all of its messages to STDERR. Let's log them to the console.
    ffmpeg.stderr.on('data', (data) => {
        ws.send('ffmpeg got some data');
        console.log('FFmpeg STDERR:', data.toString());
    });

    ws.on('message', msg => {
        if (Buffer.isBuffer(msg)) {
            console.log('this is some video data');
            ffmpeg.stdin.write(msg);
        } else {
            console.log(msg);
        }
    });

    ws.on('close', e => {
        console.log('shit got closed, yo');
        ffmpeg.kill('SIGINT');
    });
});

app.get('/', (req, res) => {

    res.send("GET Request Called")
})