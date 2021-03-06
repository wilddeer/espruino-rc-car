/*
 *  Communication
 */

// Socket
var socketConnected = false;

function connectToServer() {
    require("net").connect({
        host: '192.168.2.179',
        port: 8000
    }, function(socket) {
        console.log('Connected to the server!');

        socketConnected = true;

        var dataBuffer = '';

        socket.on('data', function(data) {
            console.log('data', data);

            dataBuffer += data;

            var pieces = dataBuffer.split(';');

            dataBuffer = pieces.pop();

            var lastCompletedPiece = pieces.pop();

            if (lastCompletedPiece) {
                var powerMap = lastCompletedPiece.split(':').map(function(value) {
                    return parseFloat(value);
                });

                if (powerMap.length == 2 && socketConnected) setPower(powerMap);
            }
        });

        socket.on('close', function() {
            console.log('closed!');
            socketConnected = false;
            setPower([0, 0]);
        });
    });
}

// WiFi

// Setup serial port to connect to the ESP8266 WiFi module
PrimarySerial.setup(115200, {rx: P0, tx : P1});

// Connect to the ESP8266 WiFi module
var wifi = require('ESP8266WiFi_0v25').connect(PrimarySerial, function(err) {
    if (err) throw err;

    wifi.reset(function(err) {
        if (err) throw err;

        console.log('Connecting to WiFi');

        // Connect to the WiFi access point
        wifi.connect('name', 'password', function(err) {
            if (err) throw err;

            console.log('Connected to WiFi');

            connectToServer();
        });
    });
});


/*
 *  Motors
 */

var Motor = require('motor');

var rightMotors = new Motor({
        powerPin: P3,
        directionPin: P12
});

var leftMotors = new Motor({
        powerPin: P11,
        directionPin: P13
});

// Sets power to left & right motor pairs
function setPower(powers) {
    leftMotors.set(powers[0]);
    rightMotors.set(powers[1]);
}




/*
 *  IR controls
 */

// Remote control buttons mapped to their IR codes
var irCodesMap = {
    66904863: '5',
    66915063: '7',
    66923223: '8',
    66931383: '9'
};

// Commands mapped to the remote control buttons
var commandsMap = {
    '7': 'left',
    '9': 'right',
    '5': 'up',
    '8': 'down'
};

// Power pairs (for left & right motor pairs) mapped to commands
var powerMap = {
    left: [-1, 1],
    right: [1, -1],
    up: [1, 1],
    down: [-1, -1],
    stop: [0, 0]
};

var IR = require('@amperka/ir-receiver');
var ir = IR.connect(P7);

var irTimeout = null;

ir.on('receive', function(code, isRepeat) {
    console.log('code, isRepeat', code, isRepeat);

    var button = irCodesMap[code];

    if (!button) return;

    var command = commandsMap[button];

    if (!command) return;

    console.log('command', command);
    if (powerMap[command]) {
        console.log('setting power', powerMap[command]);
        setPower(powerMap[command]);

        if (irTimeout) {
            clearTimeout(irTimeout);
        }

        irTimeout = setTimeout(function() {
            console.log('stop');
            setPower(powerMap.stop);
            irTimeout = null;
        }, 150);
    }
});
