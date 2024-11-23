// index.js

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const serviceAccount = require('./conexion-agraria-firebase-adminsdk-ha2ts-793e939244.json');

// Inicializa Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://conexion-agraria-default-rtdb.firebaseio.com",
  storageBucket: "conexion-agraria.appspot.com"
});

const app = express();
app.use(cors({ origin: true }));

const SECRET_KEY = 'supersecreta123';

// Endpoint combinado
app.get('/getCombinedData', async (req, res) => {
  try {
    // Verificar la llave secreta
    const secretKey = req.query.secretKey || req.headers['x-secret-key'];
    if (!secretKey || secretKey !== SECRET_KEY) {
      return res.status(403).json({ error: 'Acceso denegado: llave secreta inválida.' });
    }

    // Obtener datos de Properties
    const propertiesSnapshot = await admin.database().ref('Api/Properties').once('value');
    const properties = propertiesSnapshot.val();

    if (!properties) {
      throw new Error('No se encontraron propiedades en la base de datos.');
    }

    // Obtener datos de Department
    const departmentSnapshot = await admin.database().ref('Api/Department').once('value');
    const departments = departmentSnapshot.val();

    if (!departments) {
      throw new Error('No se encontraron departamentos en la base de datos.');
    }

    // Obtener datos de PropertiesStatus
    const statusSnapshot = await admin.database().ref('Api/PropertiesStatus').once('value');
    const statuses = statusSnapshot.val();

    if (!statuses) {
      throw new Error('No se encontraron estados de propiedades en la base de datos.');
    }

    // Generar URLs de imágenes basadas en los nombres en el JSON de Properties
    const storageBaseUrl = "https://firebasestorage.googleapis.com/v0/b/conexion-agraria.appspot.com/o/predios%2F";
    const imagesBaseUrlSuffix = "?alt=media";

    // Combinar datos
    const combinedData = Object.keys(properties).map(key => {
      const property = properties[key];
      const departmentNames = property.departamento.map(depId => departments[depId]?.nombre || 'Desconocido');
      const propertyImages = property.imagenes.map(image => image ? `${storageBaseUrl}${encodeURIComponent(image)}${imagesBaseUrlSuffix}` : null);

      // Obtener el estado del predio
      const propertyStatus = statuses[property.estado_predio_id];

      // Crear el objeto combinado con el campo ID y sin el campo estado_predio_id
      const combinedProperty = {
        id: key, // Aquí se añade el ID de la propiedad
        ...property,
        departamento: departmentNames,
        imagenes: propertyImages,
        estado_predio: propertyStatus ? propertyStatus.estado_predio : 'Desconocido',
        descripcion_estado: propertyStatus ? propertyStatus.descripcion : 'Descripción no disponible'
      };

      // Eliminar el campo estado_predio_id
      delete combinedProperty.estado_predio_id;

      return combinedProperty;
    });

    // Filtrar el campo "usuarios" antes de enviar la respuesta
    const filteredData = combinedData.map(({ usuarios, ...rest }) => rest);

    res.status(200).json(filteredData);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
});

module.exports = app; // Exportar la app completa
