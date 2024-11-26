const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

// Inicialización de Firebase Admin SDK
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://conexion-agraria-default-rtdb.firebaseio.com",
    storageBucket: "conexion-agraria.appspot.com"
  });

  console.log('Firebase Admin SDK inicializado correctamente.');
} catch (error) {
  console.error('Error inicializando Firebase Admin SDK:', error.message);
  process.exit(1); // Terminar la ejecución si no se inicializa Firebase
}

const app = express();
app.use(cors({ origin: true }));

const SECRET_KEY = 'supersecreta123';

// Endpoint combinado
app.get('/getCombinedData', async (req, res) => {
  try {
    const secretKey = req.query.secretKey || req.headers['x-secret-key'];
    if (!secretKey || secretKey !== SECRET_KEY) {
      return res.status(403).json({ error: 'Acceso denegado: llave secreta inválida.' });
    }

    const propertiesSnapshot = await admin.database().ref('Api/Properties').once('value');
    const properties = propertiesSnapshot.val();

    if (!properties) throw new Error('No se encontraron propiedades en la base de datos.');

    const departmentSnapshot = await admin.database().ref('Api/Department').once('value');
    const departments = departmentSnapshot.val();

    if (!departments) throw new Error('No se encontraron departamentos en la base de datos.');

    const statusSnapshot = await admin.database().ref('Api/PropertiesStatus').once('value');
    const statuses = statusSnapshot.val();

    if (!statuses) throw new Error('No se encontraron estados de propiedades en la base de datos.');

    const storageBaseUrl = "https://firebasestorage.googleapis.com/v0/b/conexion-agraria.appspot.com/o/predios%2F";
    const imagesBaseUrlSuffix = "?alt=media";

    const combinedData = Object.keys(properties).map(key => {
      const property = properties[key];
      const departmentNames = property.departamento.map(depId => departments[depId]?.nombre || 'Desconocido');
      const propertyImages = property.imagenes.map(image => image ? `${storageBaseUrl}${encodeURIComponent(image)}${imagesBaseUrlSuffix}` : null);
      const propertyStatus = statuses[property.estado_predio_id];

      const combinedProperty = {
        id: key,
        ...property,
        departamento: departmentNames,
        imagenes: propertyImages,
        estado_predio: propertyStatus ? propertyStatus.estado_predio : 'Desconocido',
        descripcion_estado: propertyStatus ? propertyStatus.descripcion : 'Descripción no disponible'
      };

      delete combinedProperty.estado_predio_id;
      return combinedProperty;
    });

    const filteredData = combinedData.map(({ usuarios, ...rest }) => rest);
    res.status(200).json(filteredData);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
