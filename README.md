# Plec Infernal

FPS retro de **Dejoco Arts** en una impremta de cartró plegat. Campanya de 30 nivells, sis capítols, 14 tipus de monstres i set armes. Pots continuar la campanya en el mateix navegador o provar directament qualsevol nivell des del menú.

[Juga a GitHub Pages](https://skirep.github.io/plec-infernal/)

## Controls

| Acció | Ordinador | Mòbil |
| --- | --- | --- |
| Moure’s | WASD o fletxes amunt i avall | Joystick |
| Mirar | Ratolí o fletxes esquerra i dreta | Arrossega sobre l’escenari |
| Disparar | Clic o espai | FOC |
| Canviar d’arma | 1–7, roda del ratolí o Q/E | ARMA |
| Córrer | Maj | |
| Mapa i pausa | M i Esc | Mapa i Pausa |

La sortida s’obre quan trobes el segell, neteges el nivell o derrotes el cap, segons l’objectiu indicat. Les armes es desbloquegen al llarg de la campanya. El selector independent obre cada mapa amb les armes corresponents a aquell nivell.

## Desenvolupament

Serveix l’arrel amb `python3 -m http.server 8080` i obre `http://localhost:8080`. El joc és estàtic i carrega els mòduls i la llibreria gràfica directament del repositori. A GitHub Pages es publica des de `main` i l’arrel del repositori.

Les il·lustracions es renderitzen al navegador amb el kit [Papercraft](https://github.com/xikhar/papercraft). La llicència MIT del kit es troba a [vendor/LICENSE](vendor/LICENSE).
