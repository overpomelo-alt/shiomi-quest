# 汐見町 — where the pictures live

The published game is `dist/index.html` (code + data, ~2.6 MB) plus one file per picture under `dist/assets/`.
`python3 build.py` regenerates `dist/` from `src/`. Every URL carries `?v=<hash>`, so a replaced picture is never served stale.
`dist/assets/catalog.json` lists every file with its group and size.

| dist/assets/…                     | comes from                         | what it is |
|----------------------------------|------------------------------------|------------|
| characters/players/<id>.webp      | src/sprites/hero1, sailor, hoodie, sporty, green, redcap | the six student looks: stand + walk (front/side/back) |
| characters/actions/act0N.webp     | src/sprites/act01..06              | first action pack: sit, wave, laugh, shoot, dunk |
| characters/actions/act0Nd.webp    | raw/actions/student-daily          | sit down/stand up, read, write, type, bed enter/exit |
| characters/actions/act0Ni.webp    | raw/actions/student-interactions   | pet/feed a pet, reach, give, pick up, blink, talk, nod, shake, think, surprised, sad, cheer |
| characters/actions/act0Ns.webp    | raw/actions/student-sports         | jump, dribble, catch |
| characters/actions/act0Nr.webp    | raw/actions/student-run            | run cycle front/side/back (6 frames each) + brake poses; bigger cells (336x320) |
| characters/residents/res01..10    | old standing sheets + raw/actions/resident-walk | 15 cells: 3 standing + 4 front / 4 side / 4 back walk |
| characters/pets/cat_*, shiba_*    | old pet sheets + raw/actions/pet-transitions | 32 cells: old 20 + lie down / get up / jump / eat |
| characters/pets/ani_*             | raw/wild_animals/<pack> via pack_animals.py | new animals (shepherd, leopard cat, black leopard; later maltese, poodle, black bear): 0 front sit, 1-2 side walk, 3-4 back walk, then every pose by name |
| characters/npcs/…                 | src/sprites                        | grandpa, fisher, guard, clerk, bike, resgrp |
| rooms/cabin, home, bath, rest     | src/troom (room.json keeps the layout) | teacher cabin, student room, bathroom, bed-rest layers |
| rooms/station                     | src/sroom (station_v4.py from raw/station_v4) | station hall v4 (gates inside the platform doorway) + portal pictures |
| rooms/furniture                   | src/hroom                          | decor furniture icons |
| ui/loading-run.webp               | src/loader                         | loading screen runner |

Student numbers in the action packs: 01 straw hat (hero1), 02 sailor, 03 pink hoodie (hoodie), 04 yellow tee (sporty),
05 green hoodie (green), 06 red cap (redcap).

## Adding or replacing action frames

1. Put the pack folder in `raw/actions/<pack-id>/` (`manifest.json` + `frames/…png`, as the art packs are delivered;
   if a pack only has `preview.html`, its images are inside it — the extraction snippet is in pack_actions.py's history).
2. `python3 pack_actions.py` rebuilds the sheets in `src/sprites/` and their entries in `src/sprites/meta.json`
   (frame keys, per-frame durations and loop flags come straight from the manifest).
3. `python3 build.py`.

`raw/sprites_orig/` holds the resident and pet sheets from before this pass; pack_actions.py always starts from them.

## 2026-10-11
- `ani_maltese`, `ani_poodle`, `ani_blackbear`: from raw/wild_animals/shiomi-wild-animals-2 via pack_animals.py (maltese/poodle join the adoption list; black bear lives in the new rescue yard of 動物之家 with care-to-release).
- 五年級教室: raw/classroom (shiomi-classroom.zip) -> classroom_build.py -> src/troom/class_* + room.json['class']; walkable 2D room (R2.room='class'), entered from the ground-floor door of the school block in Sqoyaw.
