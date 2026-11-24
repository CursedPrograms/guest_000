# guest_000 TODO

- [ ] **Monster jump scares**: Kimmie generates the monster pictures in Gemini and drops them in `images/monsters/`.
      Then: link them in, so each scare picks a random monster (the SVG face stays as the fallback).
- [ ] **Webcam scare**: guest_000 asks to "see you" (the browser's own camera prompt, so it's opt-in; "no" just
      makes it sulk). If allowed, show the player's live face, glitched, with "i can see you" and one of the
      monsters appearing behind their shoulder, then a jump scare. The feed stays in the page: never recorded or
      uploaded, and the camera turns off right after (the camera light goes off). Works on Pages (https).
- [ ] **Screams**: Kimmie makes the horror screams and drops them in `audio/screams/` (mp3/ogg/wav).
      Then: each scare plays a random scream with the monster (the synth sting stays as the fallback), and
      they go quiet with the rest of the sound on Esc Esc.
