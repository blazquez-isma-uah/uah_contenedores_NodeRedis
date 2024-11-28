import express from 'express';
import fetch from 'node-fetch';
import { createClient } from 'redis';
const PORT = process.env.APP_PORT || 5000
const REDIS_PORT = process.env.REDIS_PORT || 6379
const app = express();
console.log("Creando cliente");
const client = createClient({
    socket: {
        host: '172.17.0.2',
        port: REDIS_PORT
    },
    legacyMode: true
}
);  //Legacy mode necesario para la nueva versión del cliente REDIS. Conexión por defecto.
    // Si no se pone, entonces funcionan los módulos nuevos y hay que hacer catch en los envíos.

await client.connect();   //Mandatorio para nueva versión del cliente REDIS

console.log("Cliente redis creado");
async function getRepos(req,res,next){
    console.log('Haciendo una petición a la API de GitHub');
    const {username} = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();
    const repos = data.public_repos;
    
    client.setex(username,120,repos);
    res.send(formateaSalida(username, repos));
    console.log('Fin de la petición a la API de GitHub');
}
function formateaSalida(usr,rep){
    return `<h4>El usuario ${usr} tiene ${rep} repositorios.</h4>`;
}
function cacheo(req,res,next){
    console.log('Testando el sistema de caché');
    const {username} = req.params;
    
    client.get(username, (err,data) => {
        if (err) {
            console.log('problema al conectar a REDIS'); //Nuevo para detectar problemas y seguir ejecución.
            next();
        }
        if (data!==null) {
            console.log("He hecho un caché hit!");
            res.send(formateaSalida(username,data));
        }else{
            console.log('caché miss');
            next();
        }
    })
}

app.get('/datosrepositorio/:username', cacheo, getRepos);
app.listen(PORT,() => {
    console.log(`Lanzada la aplicación en el puerto ${PORT}`);
})
