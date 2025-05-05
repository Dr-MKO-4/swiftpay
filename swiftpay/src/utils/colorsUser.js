// src/utils/colorsUser.js
import { useColorScheme } from 'react-native';

const palette = {
  light: {
    background:  '#FFFFFF',   // blanc pur
    secondary:   '#9ee37d',   // vert clair
    violet:      '#d81159',   // magenta foncé
    cards:       '#441f73',   // violet très sombre
    accent:      '#f35b04',   // orange vif
    primary:     '#552594',   // violet profond
    text:        '#333333',   // gris très foncé
    placeholder: '#333333',   // même que le texte
    card:        '#FFFFFF',   // blanc
    border:      '#441f73',   // gris très clair pour les bordures
    notification:'#d81159',   // même que violet pour alertes
    vert:          '#9ee37d',   // vert clair'
    blanc:        '#FFFFFF',   // blanc pur
    footer:      '#441f73',   // même que background
    noir:        '#000000',   // noir pur
  },
  dark: {
    background:  '#1A1A1A',   // presque noir
    secondary:   '#75b35a',   // vert un peu plus sombre
    violet:      '#b00f4a',   // magenta légèrement atténué
    accent:      '#c24703',   // orange un peu plus doux
    primary:     '#75b35a',   // violet plus profond/assombri
    text:        '#F2F2F2',   // gris très clair
    placeholder: '#AAAAAA',   // gris moyen
    card:        '#2A2A2A',   // gris foncé
    border:      '#3A3A3A',   // gris moyen-foncé
    notification:'#b00f4a',   // même que violet dark
    cards:       '#441f73',   // violet très sombre
    blanc:      '#FFFFFF',   // blanc pur
    footer:      '#441f73',   // même que background
    vert:          '#9ee37d',   // vert clair'
    noir:        '#000000',   // noir pur

  },
};

export function useThemeColors() {
  const scheme = useColorScheme();
  return palette[scheme] || palette.light;
}
