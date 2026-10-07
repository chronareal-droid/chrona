# The Way of the Cross · The Shepherd King

A third-person 3D Bible story game for the browser (Vite + three.js). Separate from the spa site at the repo root.

```bash
cd game
npm install
npm run models:fetch   # optional: save the realistic Jesus model into public/models (see below)
npm run dev            # http://localhost:5174
npm run build          # static game in game/dist
```

## Campaigns

**The Way of the Cross** (main story, play as Jesus). Told reverently, with no combat:

1. *Hosanna*: ride the colt into Jerusalem through crowds with palm branches (Matthew 21)
2. *The House of Prayer*: overturn the moneychangers' tables, teach in the temple, heal the blind and lame
3. *The Upper Room*: wash the disciples' feet; the bread and the cup
4. *Gethsemane*: three prayers at night, the arrest, healing Malchus's ear
5. *The Way of the Cross*: before Pilate, carry the cross (strength meter, falls, Simon of Cyrene), the seven last words, darkness at noon
6. *He Is Risen*: the stone rolled away, Mary Magdalene, Thomas, the Great Commission and the ascension

**The Shepherd King** (Old Testament, play as David, 1 Samuel 16–17): the anointing, the lion, the road to Elah, the camp, five smooth stones, the duel with Goliath.

## Systems

- **Camera**: `V` cycles third person → first person → second person (the "Witness" view, looking back at the hero)
- **Holy Spirit**: `Q` when the meter shines; it gathers through prayer at altars, teaching or preaching, healing, scrolls and kindness
- **Teaching / preaching**: choose the answer from Scripture, then time your words in the conviction meter
- **Healing** (Gospel), **sling combat** (David), **ridable donkey and camel**
- **12 scripture scrolls** per campaign, with rewards at 3/6/9/12
- **Side quests**: The Lost Sheep, Bread for the Widow, A Cup of Cold Water / Water for the Wounded, and **The Scribe's Riddles** (unscramble seven Bible names)
- Home screen, chapter select, pause menu, journal, settings; progress saves in the browser
- Graphics presets Low → Ultra (4K): GTAO ambient occlusion, bloom, SMAA, depth of field in cutscenes, film grade

## The realistic Jesus model

`public/models/models.json` points at a textured, PBR, auto-rigged GLB generated with Higgsfield (Meshy 7 image-to-3D).
The game loads `./models/jesus.glb` if present, otherwise the hosted copy, and falls back to the built-in figure if neither
loads. `npm run models:fetch` downloads the hosted file into `public/models/` so the game serves it itself.
The rig is driven by the game's own procedural animation (`src/models.js` retargets onto the GLB skeleton).

## Story clips

`public/clips/clips.json` maps cutscene ids to video files. When an id is present, that video plays (skippable)
in place of the in-engine cutscene.
