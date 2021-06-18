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
        this.resetFunc(this);
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
    static get parameterDescriptors() { return[ 
        {
            name: 'ctxData',
            defaultValue: { init: false }
        }
    ];}

    constructor() {
        super();

        this.bufferClass = false;
        this.run = true;

        this.port.onmessage = (event) => {
            if (event.data === 'end') this.run = false;
        }
    }

    process(input, output, parameters) {
        if (!this.bufferClass) {
            if (parameters.ctxData.init) this.bufferClass = new Float32AudioBuffer(parameters.ctxData.sampleRate, parameters.ctxData.size, (that) => {
                this.port.postMessage(that.buffer)
            });
            else return true;
        }

        const buffer = input[0];
        this.bufferClass.append(buffer);

        return this.run;
    }
}

registerProcessor('worklet-processor', Processor)