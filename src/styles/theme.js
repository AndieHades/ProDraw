// Тема: ставит data-theme на <html> (токены в tokens.css переопределяются).
import * as bus from '../core/bus.js';

const STORE = 'theme';

export function applyTheme() { let th; try { th = localStorage.getItem(STORE); } catch (e) {}
  if (th === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme'); }

export const getTheme = () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

export function toggleTheme() { const next = getTheme() === 'light' ? 'dark' : 'light';
  try { localStorage.setItem(STORE, next); } catch (e) {}
  applyTheme(); bus.emit('theme', next); bus.emit('render'); }
