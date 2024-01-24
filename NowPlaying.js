import React, { useEffect, useState } from 'react';
import querystring from 'querystring';
import { Buffer } from 'buffer';
import {AiOutlinePauseCircle} from 'react-icons/ai';
import {BiErrorCircle} from 'react-icons/bi'
import {HiOutlineStatusOffline} from 'react-icons/hi'
import './styles.css'



//Setting up the Spotify API and Endpoints
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const client_id = '0782e656578048f9bc878b1bb39133eb';
const client_secret = 'd5feb3c434564d0a9ff3b8eeb279cfd0';
const refresh_token = 'AQDwT-91IyiTYgFlD3L95TQrqFNxr_Gm7sipyodWoI9NpOPZ4svLyAtskYSEgyE__hX6BaDOjcmr6Q0yeqZ31ZOyB3puOZ_TuIZc6RRPpqfy5gfNPl0ec9EB1lMieDioI4c';



//Función para generar un token de acceso utilizando el token de actualización cada vez que se abre o actualiza el sitio web
export const getAccessToken = async (client_id, client_secret, refresh_token) => {
    //Crea un código base64 de client_id:client_secret según lo requiere la API
    const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

    //La respuesta contendrá el token de acceso.
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token,
        }),
    });

  return response.json();
};

//Utiliza el token de acceso para buscar la canción que se reproduce actualmente
export const getNowPlaying = async () => {
  try {

    //Generando un token de acceso
    const { access_token } = await getAccessToken(client_id, client_secret, refresh_token);

    //Obteniendo la respuesta
    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    //Si el estado de respuesta > 400 significa que hubo algún error al obtener la información requerida
    if (response.status > 400) {
      throw new Error('Unable to Fetch Song');
    } else if(response.status === 204) { //Se obtuvo la respuesta pero no había contenido.
      throw new Error('Currently Not Playing')
    }

    //Extraer los datos requeridos de la respuesta en variables separadas
    const song = await response.json();
    const albumImageUrl = song.item.album.images[0].url;
    const artist = song.item.artists.map((artist) => artist.name).join(', ');
    const isPlaying = song.is_playing;
    const songUrl = song.item.external_urls.spotify;
    const title = song.item.name;
    const timePlayed = song.progress_ms;
    const timeTotal = song.item.duration_ms;
    const artistUrl = song.item.album.artists[0].external_urls.spotify;

    //Devolviendo los detalles de la canción
    return {
      albumImageUrl,
      artist,
      isPlaying,
      songUrl,
      title,
      timePlayed,
      timeTotal,
      artistUrl
    };
  } catch (error) {
    console.error('Error fetching currently playing song: ', error);
    return error.message.toString();
  }
};

//Función principal para procesar los datos y renderizar el widget.
const NowPlaying = () => {

  //Mantener información sobre la canción que se está reproduciendo actualmente.
  const [nowPlaying, setNowPlaying] = useState(null);

  useEffect(() => {
    const fetchNowPlaying = async () => {
      const data = await getNowPlaying();
      setNowPlaying(data)
    };

    //La API de Spotify no admite sockets web, por lo que para seguir actualizando la canción que se está reproduciendo actualmente y el tiempo transcurrido, llamamos a la API cada segundo.
    setInterval(() => {
      fetchNowPlaying();
    }, 1000);

  }, []);

  //Establecer valores predeterminados para el estado actual del oyente y la duración de la canción reproducida
  let playerState = ''
  let secondsPlayed = 0, minutesPlayed = 0, secondsTotal = 0, minutesTotal = 0;
  let albumImageUrl = './images/albumCover.png'
  let title = ''
  let artist = ''

  if (nowPlaying != null && nowPlaying.title) {

    //Se utiliza mientras se muestra un icono de barra de sonido/pausa en el widget
    nowPlaying.isPlaying ? playerState = 'PLAY' : playerState = 'PAUSE'

    //Convertir la duración de la reproducción de segundos a minutos y segundos
    secondsPlayed = Math.floor(nowPlaying.timePlayed/1000);
    minutesPlayed = Math.floor(secondsPlayed/60);
    secondsPlayed = secondsPlayed % 60;

    //Convertir la duración de la canción de segundos a minutos y segundos
    secondsTotal = Math.floor(nowPlaying.timeTotal/1000);
    minutesTotal = Math.floor(secondsTotal/60);
    secondsTotal = secondsTotal % 60;

    albumImageUrl = nowPlaying.albumImageUrl
    title = nowPlaying.title
    artist = nowPlaying.artist
  } else if (nowPlaying === 'Currently Not Playing') { //Si la respuesta devuelve este mensaje de error, imprimimos el siguiente texto en el widget
    playerState = 'OFFLINE' 
    title = 'User is'
    artist = 'currently Offline'
  } else { //Si la respuesta no pudo obtener nada, mostramos esto
    title = 'Failed to'
    artist = 'fetch song'
  }

  //Se utiliza para establecer 0 como relleno cuando es un número de un solo dígito
  const pad = (n) =>{
    return (n < 10) ? ("0" + n) : n;
  }

  return (
    //Dependiendo del valor de playerState, se actualizan el href, la imagen del álbum y los íconos.
    <a style={{textDecoration: 'none', color: 'black'}} href={playerState === 'PLAY' || playerState === 'PAUSE' ? nowPlaying.songUrl : ''}>
    <div className='nowPlayingCard'>
      {/* Imagen de álbum y href mostrados según playerState */}
      <div className='nowPlayingImage'>
        {playerState === 'PLAY' || playerState === 'PAUSE' ? <a href={nowPlaying.songUrl}><img src={albumImageUrl} alt="Album" /></a> : <img src={albumImageUrl} alt="Album" />}
      </div>
      <div id='nowPlayingDetails'>
        {/* Título de la canción mostrado según playerState */}
        <div className={`nowPlayingTitle ${title.length > 15 ? 'marquee-content' : ' '}`}>
          {playerState === 'PLAY' || playerState === 'PAUSE' ? <a href={nowPlaying.songUrl}>{title}</a> : title}
        </div>
        {/* Artista mostrada basada en playerState*/}
        <div className='nowPlayingArtist'>
        {playerState === 'PLAY' || playerState === 'PAUSE' ? <a href={nowPlaying.artistUrl}>{artist}</a> : artist}
        </div>
        {/* Temporizador de canción mostrado según playerState */}
        <div className='nowPlayingTime'>{pad(minutesPlayed)}:{pad(secondsPlayed)} / {pad(minutesTotal)}:{pad(secondsTotal)}</div>
      </div>
      {/* Icono mostrado según el estado del jugador */}
      <div className='nowPlayingState'>
      {playerState === 'PLAY' ? <img alt='soundbar' src='./images/soundbar.gif' title='Now Listening'/> : playerState === 'PAUSE' ? <AiOutlinePauseCircle size={40} /> : playerState === 'OFFLINE' ? <HiOutlineStatusOffline size={40}/> : <BiErrorCircle size={40}/> }</div>
    </div>
    </a>
  );
};

export default NowPlaying;