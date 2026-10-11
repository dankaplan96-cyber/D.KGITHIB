The engine-ready mesh is generated from the source parameters (src/game/characters.js) and stored pre-sculpted in
assets/bake.bin, which the game loads at start-up.

`twinsen.obj` is a static rest-pose export with vertex colours (body, arms, hands, shoes, eyes, mouth, medallion)
for review in Blender or any OBJ viewer. Re-export after changing the design:

    python3 -m http.server 8123 &
    node tools/export-character.mjs twinsen 8123

Preview in the review scene: lookdev.html?c=twinsen&views=0,0.62,1.57,3.14 (&mat=grey|sil, &anim=walk&t=0.3).
