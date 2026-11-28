# guest_000 TODO

- [x] **Monster jump scares**: four monsters in `images/monsters/` (web-sized from Kimmie's originals); each scare,
      the ending's included, picks a random one (never the same twice running) and fills the screen through the glitch
      layers. The SVG face stays as the fallback until they load. `images/cover.jpg` is the cover, for the README/preview.
- [ ] **Webcam scare**: guest_000 asks to "see you" (the browser's own camera prompt, so it's opt-in; "no" just
      makes it sulk). If allowed, show the player's live face, glitched, with "i can see you" and one of the
      monsters appearing behind their shoulder, then a jump scare. The feed stays in the page: never recorded or
      uploaded, and the camera turns off right after (the camera light goes off). Works on Pages (https).
- [ ] **Screams**: Kimmie makes the horror screams and drops them in `audio/screams/` (mp3/ogg/wav).
      Then: each scare plays a random scream with the monster, and the distant screams in the room sounds use them too (the synth versions stay as the fallback), and
      they go quiet with the rest of the sound on Esc Esc.
