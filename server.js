//const sql = require('mysql');
const socket = require('socket.io');
const port = process.env.PORT || 2000;

const EventEmitter = require('events');

const specialNumbers = {1337:'1337.mp3'};
const connectionTimeout = 30000;

// sockets data
const sockets = {
    pairs: {},
    numbers: {}
}

// express js
const express = require('express');
const app = express();

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(express.static('public'));

// socket
const server = app.listen(port, () => console.log(`[ SERVER ] running on ${port}`));
const io = socket(server);

// delete excess data
const endCall = (clientSocket) => {
    if(sockets.pairs[sockets.pairs[clientSocket.number]]) {
        const clientSocket1 = sockets.numbers[sockets.pairs[clientSocket.number]];
        sockets.pairs[clientSocket1.number] = null;
        sockets.numbers[clientSocket1.number] = null;

        clientSocket1.emit('state', 'call ended 😪');
        clientSocket1.disconnect(true);
        console.log(`[ DISCONNECT ] ${clientSocket1.number}`)
    }

    sockets.pairs[clientSocket.number] = null;
    sockets.numbers[clientSocket.number] = null;

    console.log(`[ DISCONNECT ] ${clientSocket.number}`)
}

// on call started
app.post('/start', (req, res) => {
    let data = req.body, myNumber, number;

    // check if numbers are correct
    try {
        // nothing has been sent
        if (!data) throw new Error();
        myNumber = data.myNumber;
        number = data.number;

        // invalid clients number length
        if (isNaN(myNumber) || String(myNumber).length !== 5 || number === myNumber) throw new Error(`[ ERROR ] invalid number (${myNumber})`);
        // invalid called number
        if ((isNaN(number) || String(number).length !== 5) && !specialNumbers[number] ) throw new Error(`[ ERROR ] invalid number (${number})`);
        // number already exists
        if (sockets.pairs[myNumber]) throw new Error(`[ ERROR ] ${myNumber} is already taken`);
        // number is busy
        if (sockets.pairs[number] && sockets.pairs[sockets.pairs[number]]) throw new Error(`[ ERROR ] ${number} is busy`);
    } catch (err) {
        // if incorrect number throw error
        res.status(400).send('invalid number 🙄');
        throw console.error(err.message);
    }

    // send success response
    res.send({success: 'call started 😊'});
    io.sockets.once('connection', clientSocket => {
        clientSocket.emit('state', 'call started 😊');
        clientSocket.number = myNumber;
        sockets.numbers[myNumber] = clientSocket;
        sockets.pairs[myNumber] = number;

        console.log(`[ CONNECT ] ${myNumber}`);

        // if pair already exists
        if (sockets.pairs[number] === myNumber) sockets.numbers[number].connectEvent.emit('connected'); // tell to the first client about connection
        else {
            const event = sockets.numbers[myNumber].connectEvent = new EventEmitter();

            // promise that resolves after second number connects
            new Promise((res, rej) => {
                const out = setTimeout(rej, connectionTimeout);

                event.once('connected', () => {
                    clearTimeout(out);
                    res();
                });
            })
            .then(() => {
                const clientSocket1 = clientSocket;
                const clientSocket2 = sockets.numbers[sockets.pairs[clientSocket1.number]];

                console.log(`[ PAIRED ] ${clientSocket1.number} + ${clientSocket2.number}`);

                clientSocket.emit('state', 'your friend connected 🤩');

                clientSocket1.on('data', (data) => clientSocket2.emit('sound', data));
                clientSocket2.on('data', (data) => clientSocket1.emit('sound', data));
            })
            .catch((err) => {
                if(sockets.numbers[clientSocket.number] && sockets.numbers[clientSocket.number].id === clientSocket.id) {
                    clientSocket.emit('state', 'no one connected 😓');
                    console.log(`[ TIMEOUT ] ${clientSocket.number}`);
                    clientSocket.disconnect(true);
                }
            });
        }

        // on call ended
        app.post('/end', (req, res) => {
            clientSocket.emit('state', 'call ended 😪');
            clientSocket.disconnect(true);
        });

        clientSocket.on('disconnect', () => endCall(clientSocket));
    });
});