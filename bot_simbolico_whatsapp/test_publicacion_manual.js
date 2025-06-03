require('dotenv').config({ path: '../.env' });

const InstagramStoriesAutomation = require('./comandos/instagram_automation');

const instancia = new InstagramStoriesAutomation();

instancia.pendingVideos = new Map();

instancia.pendingVideos.set('demo123', {
    videoData: { path: 'temp_video_demo123.mp4' },
    contacto: 'TestUser',
    state: 'pendiente',
    timestamp: Date.now()
});

instancia.confirmarPublicacion('demo123', true)
  .then(console.log)
  .catch(console.error);
