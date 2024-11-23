// localServer.js

const express = require('express');
const functions = require('./index'); // Aquí estamos importando la app completa

const app = express();

// Usa la aplicación Express de functions directamente
app.use(functions); // Usamos la app directamente sin prefijar la ruta

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
