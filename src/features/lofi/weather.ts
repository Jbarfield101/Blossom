import { useLofi } from './SongForm';

export type WeatherCondition = 'sunny' | 'rain' | 'snow';

const rainCodes = new Set<number>([
  51, 53, 55, 56, 57, // drizzle
  61, 63, 65, 66, 67, // rain
  80, 81, 82, // rain showers
]);

const snowCodes = new Set<number>([
  71, 73, 75, 77, // snow
  85, 86, // snow showers
]);

export function mapWeatherCode(code: number): WeatherCondition {
  if (rainCodes.has(code)) return 'rain';
  if (snowCodes.has(code)) return 'snow';
  return 'sunny';
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherCondition> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const res = await fetch(url);
  const json = await res.json();
  const code = json?.current_weather?.weathercode;
  return mapWeatherCode(code);
}

export function applyWeather(condition: WeatherCondition) {
  const lofi = useLofi.getState();
  switch (condition) {
    case 'rain':
      lofi.setBpm(70);
      lofi.setKey('D');
      break;
    case 'snow':
      lofi.setBpm(60);
      lofi.setKey('E');
      break;
    default:
      lofi.setBpm(90);
      lofi.setKey('C');
      break;
  }
}

export async function generateWeatherTrack(lat: number, lon: number) {
  const condition = await fetchWeather(lat, lon);
  applyWeather(condition);
  await useLofi.getState().play();
}
