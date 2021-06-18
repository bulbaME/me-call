class Float32AudioBuffer {
    constructor(sampleRate, size, reset) {
        this.sampleRate = sampleRate;
        this.size = size;
        this.bufferSize = 0;

        this.buffer = new Float32Array(size);
        this.resetFunc = reset;
    }

    // send when overflows
    reset() {
        this.bufferSize = 0;
        this.resetFunc();
    }

    append(buffer) {
        for(let c = 0; c < buffer.length; c++) {
            if(this.bufferSize >= this.size) this.reset();

            this.buffer[this.bufferSize] = buffer[c];
            this.bufferSize++;
        }
    }
}

class Processor extends AudioWorkletProcessor {
    constructor() {
        super();

        this.ctx = this.context;
        this.bufferClass = new Float32AudioBuffer();
        this.run = true;
    }

    process(input, output, params) {
        const buffer = input[0];


        return this.run
    }
}

registerProcessor('worklet-processor', Processor)