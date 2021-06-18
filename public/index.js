const io = require('socket.io-client');
const EventEmitter = require('events');

let socket;
let audioContext;

// create gain node
// const volumeNode = audioContext.createGain();
// volumeNode.gain.value = 0.03;

// send encoded audio data
const send = (chunkData) => socket.emit('data', chunkData);

let muted = false;
let currentState = $('#text').text();

// play decoded audio data
const play = ({ buffer, sample, sampleRate }) => {
    const audioBuffer = audioContext.createBuffer(1, sample, sampleRate);
    audioBuffer.copyToChannel((new Float32Array(buffer)), 0, 1);

    const audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;

    audioSource.connect(audioContext.destination);
    audioSource.start(0);
}

const stopAudioStreamEvent = new EventEmitter();
 
// on call end
const callEnded = () => {
    if (socket.connected) {
        socket.close();
        setState('call ended 😪');
    }

    stopAudioStreamEvent.emit('stop');
    buttonDecline();
}

// buttons
const buttonCall = () => $('#call').addClass('callDown').removeClass('callUp'); 

const buttonDecline = () => $('#call').addClass('callUp').removeClass('callDown');

const setState = (state = currentState) => {
    currentState = state;
    $('#text').text((muted ? '🔇 ':'') + state);
}

$(document).ready(() => {
    // mute
    $('#text').click(() => {
        if(muted) muted = false;
        else muted = true;

        setState();
    });

    // proceed call button
    $('#outerCall').click(() => {
        if (!socket) {
            audioContext = new AudioContext();
            const myNumber = +$('#myNumber').val();
            const number = +$('#number').val();

            $.post({
                traditional: true,
                url: 'start',
                contentType: 'application/json',
                data: JSON.stringify({
                    myNumber: myNumber,
                    number: number
                }),
                dataType: 'json',
                error: (jqXHR) => setState(jqXHR.responseText),
                success: () => {
                    buttonCall();

                    // connect socket
                    socket = io();

                    //update state
                    socket.on('state', setState);

                    // socket disconnect callbacks
                    socket
                    .on('disconnect', callEnded)
                    .on('connect_error', callEnded);

                    // create audio stream from microphone
                    window.navigator.mediaDevices.getUserMedia({ audio: true })
                    .then((audioMediaStream) => {
                        const floatAudioBuffer = new Float32AudioBuffer(audioContext.sampleRate, audioContext.sampleRate / 2, 
                            function() {
                                if(!muted) send({
                                buffer: this.buffer,
                                sample: this.size,
                                sampleRate: this.sampleRate
                            });
                        });

                        audioContext.audioWorklet.addModule('worklet-processor.js').then(() => {
                            const node = new AudioWorkletNode(audioContext, 'worklet-processor');
                            node.port.onmessage = (event) => send(event.data);
                        });

                        // const audioTrack = audioMediaStream.getAudioTracks()[0];
                        // const audio = (new MediaStreamTrackProcessor({ track: audioTrack })).readable; 
                        // const audioStream = new WritableStream({ write(chunk) { floatAudioBuffer.append(chunk.buffer.getChannelData(0)); }});
                        // audio.pipeTo(audioStream);
                        // stopAudioStreamEvent.on('stop', () => audioTrack.stop());

                        // const merger = audioContext.createChannelMerger(2);

                        // const sourceNode = audioContext.createMediaStreamSource(audioMediaStream);
                        // const analyser = audioContext.createAnalyser();
                        // analyser.fftSize = 2048;
                        // const buffer = new Float32Array(analyser.frequencyBinCount);

                        // sourceNode.connect(merger);
                        // merger.connect(analyser);

                        // const getData = () => {
                        //     analyser.getFloatFrequencyData(buffer)``
                        //     //floatAudioBuffer.append(buffer);
                        //     play({ buffer, sample: analyser.frequencyBinCount, sampleRate: audioContext.sampleRate });

                        //     setTimeout(getData, analyser.frequencyBinCount / audioContext.sampleRate);
                        // }

                        // getData();

                        // stopAudioStreamEvent.on('stop', () => sourceNode.disconnect());
                    })
                    .catch(err => console.error(err.message));

                    socket.on('sound', (chunkData) => play(chunkData));
                }
            });
        } else {
            callEnded();
            $.post({
                traditional: true,
                url: 'end',
                contentType: 'application/json',
            });
        }
    });
});