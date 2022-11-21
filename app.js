const app = require('express')();
const child_process = require('child_process');
const cors = require('cors');
app.use(cors({
    origin: '*'
}))
var ffmpeg;
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8080;
app.get('/', function(req, res) {
    res.send("GET Request Called")
});

io.on('connection', (socket) => {
    console.log('user connected');
    socket.emit("FromAPI", { "abc": "kkkk" });

    socket.on('startStreaming', async(data) => {
        console.log("key", data)
        const rtmpUrl = `rtmps://global-live.mux.com/app/${data.key}`;

        global['ffmpeg'] = await child_process.spawn('ffmpeg', [
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

        console.log(" ---------------- global['ffmpeg']", global['ffmpeg'])
        socket.emit("ffmpegpass", global['ffmpeg']);
    })




    socket.on('passDatatoStreaming', async(msg) => {
        // console.log("  global['ffmpeg']", global['ffmpeg'])
        if (Buffer.isBuffer(msg.data)) {
            console.log('this is some video data');

            console.log("msg.data", msg.data)
            global['ffmpeg'].stdin.write(msg.data);
            global['ffmpeg'].stdin.on('error', (e) => {
                console.log('FFmpeg STDIN Error', e);
            });
        } else {
            console.log(msg);
        }
    });
    socket.on('streamclose', e => {
        console.log('shit got closed, yo');
        global['ffmpeg'].kill('SIGINT');
    });

    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
})
server.listen(port, function() {
    console.log(`Listening on port ${port}`);
});