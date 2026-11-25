import { readNotesConfig } from './config.mjs';
import { createNotesServer } from './service.mjs';

function fail(message) {
  console.error('Notes server could not start. ' + message);
  process.exitCode = 1;
}

function start() {
  let config;
  try {
    config = readNotesConfig(process.env);
  } catch (error) {
    fail(error.message);
    return;
  }

  const { host, port, ...options } = config;
  const address = host.includes(':') ? '[' + host + ']' : host;
  const url = 'http://' + address + ':';
  const server = createNotesServer(options);
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      fail('EADDRINUSE at ' + url + port + '. Open ' + url + port + '/health to check the existing listener, or stop that server before restarting.');
    } else if (error.code === 'EADDRNOTAVAIL' || error.code === 'ENOTFOUND') {
      fail(error.code + ' for HOST=' + host + '. Set HOST in .env to the PC’s current Wi-Fi IP address, or use 127.0.0.1 for local testing.');
    } else {
      fail('Could not listen at ' + url + port + ' (' + (error.code || 'unknown error') + '). Check HOST and PORT in .env.');
    }
  });

  server.listen(port, host, () => {
    console.log('Companion notes service listening on ' + url + server.address().port);
  });
}

start();
