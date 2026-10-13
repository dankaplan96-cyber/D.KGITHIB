# LBA1 catalogue (study notes: numbers and descriptions only)

The user's LBA1 data files (BODY, ANIM, SCENE, LBA_GRI/BLL/BRK, SPRITES, INVOBJ, FILE3D, RESS, SAMPLES, TEXT)
are read in the scratchpad only and never committed. The body layout follows the engine source
(2point21/lba1-classic, LIB386/LIB_3D/P_OBJET.ASM):

- header: info word (bit 1 = animated), bounding box (6 words), a word giving the size of an info zone to skip;
- points (count, then x, y, z words); for an animated body the groups (count, then 38 bytes each: first point ×6,
  point count, origin point ×6, parent group ×38 or −1, type (rotate/translate/zoom), three angles, …, normal
  count, a 3×3 matrix); the normals (count, 8 bytes each);
- polygons (count; type byte, vertex count byte, colour word = palette ramp start (low byte) and ramp length
  (high byte); type ≥ 9 Gouraud: a normal word before each vertex index; type 7–8 flat: one face-normal word;
  vertex indices ×6); lines (count, 8 bytes); spheres (count; colour dword, radius word, centre point ×6).
- A group's points are relative to its origin point (a point of the parent group): the rest pose is the sum
  down the chain. The palette is RESS entry 0 (8-bit RGB). All 133 bodies parse to their exact end.
- Twinsen is 1240 units tall, as in LBA2 (1238).

## Bodies (BODY.HQR, 133)
| Bodies | What |
|---|---|
| 0–8 | Twinsen in LBA1: the blue tunic with the red sash (0, 3–8 variants with items/gloves), the striped prisoner's shirt (1), the grey asylum pyjamas (2) |
| 9–12 | asylum nurses / doctors in white |
| 13 | a Grobo clone (helmeted, armoured) |
| 14–17 | props (a doorway, a capsule, a vehicle, a Grobo) |
| 18–20, 62–64 | FunFrock's Grobo soldier clones (rifle, tin helmet; 62–64 with a tripod gun), three colourings |
| 21–27, 66–67 | Rabbibunny clones (21–27 in uniform, 66–67 in camouflage) |
| 28 | a street lamp |
| 29 | a Quetch businessman with a briefcase |
| 30–35, 52, 106, 117 | Grobos: townsfolk (35 in a turban, 52 in a fez, 106 with a great mane, 117 a Grobo woman) |
| 39–40 | small walking robots |
| 41–43, 72–73 | FunFrock's tanks; a car |
| 44–47 | Rabbibunny women in dresses |
| 48 | a blonde Quetch woman in a pink gown |
| 49–51, 54 | boats (sailboats, a ferry, a fishing boat) |
| 53 | a Rabbibunny sailor |
| 55 | a skeleton |
| 68–70 | Spheros: a round star-shaped body with the face in its middle, thin arms with ball hands (68 camouflaged, 69 green, 70 brown) |
| 75–77, 115 | Sphero clones / robots (a glass dome face) |
| 74 | a mantis-like creature |
| 81 | a Rabbibunny fisherman with a rod |
| 83–84 | a horse, with and without its Quetch rider |
| 85–86, 111–113 | the band: Rabbibunny rockers with guitars, a drum kit |
| 87–88 | elves: big pointed ears and nose, a pointed hat with a pompom (green; blue) |
| 94 | a Rabbibunny dancer |
| 95 | the pirate flag |
| 105 | a punk in a horned cap and dark glasses, a pink shirt |
| 109–110 | the Dino-Fly, with and without Twinsen on its back |
| 114 | a Quetch in a long blue robe (an elder) |
| 116 | a fat bald Quetch in a grey robe |
| 127–129 | Quetch guards in red and gold with swords |
| 130 | the crystal on its cart |
| 131 | Dr. FunFrock in LBA1: a round Sphero-like body in red, a brown hat, a moustache and goatee |

## Text (TEXT.HQR, two versions)
14 banks per language, English readable: 0 menus and behaviours, 2 credits, 4 inventory and holomap texts,
6–26 the islands' dialogue (Citadel, Principal, Proxima, White Leaf Desert, Rebellion, the Hamalayi Mountains,
Tippett, Brundle, Fortress, Polar Island; which bank is which island is not mapped yet), 26 the ending.

## Brought back so far
- The Spheros (68–70): looks sphero1 (green) and sphero2 (brown), Pom and Madam Rondo on Citadel (0.19.0).
  Measured: 828 units tall (0.67 of Twinsen); the star's points at (0, 828), (±399, 640), (±232, 352); the face
  ±171 wide, 457–742 high, out to z 257; hands r 57 at (±399, 313); knees r 42 at (±171, 229).
- FunFrock's fat trooper (18–20): look fclone, an enemy (0.20.0). Measured: 1196 units to the helmet top; the
  coat ±280 at the hips from the hem (75) to the shoulders (~860); hands r 33 at (±332, 298); the pack x −204…168,
  z −317…−144; the helmet dome 1066–1196.
- Rooms (0.21.0), rebuilt from their layouts (assets/lba1/*.json; src/game/lba1room.js, lba1places.js):
  - room 0, FunFrock's asylum: its door a block-house outside Citadel's old fort; guards where bodies 9/11 (nurses)
    and 13 (the clone) stood; the register in the office (cell 46.5, 14, 23.5); out by the low stair-well (10.5, 1, 42.6).
  - room 57, the Temple of Bù's spiked maze (21×20 columns): down a stair from our temple; the
    way on at cell (14, 1, 11).
  - room 40, the temple's dark halls: in at (3, 17, 3.2), the far exit (61, 17, 1.4) back up to our temple;
    crystal mites at the spots of body 59.

## Rooms and maps (LBA_GRI / LBA_BLL / LBA_BRK, SCENE)
Format (from SOURCES/GRILLE.C, GRILLE_A.ASM, DISKFUNC.C, OBJECT.C): a grid is 64×64 columns, 25 cells high; a
column is a list of runs (op byte: 00 = empty run, 01 = a run of different cells, 10 = one cell repeated; count =
low 6 bits + 1), each cell a (block, position) pair into the room's block library; a block is dx·dy·dz bricks of
4 bytes (collision shape, sound, brick sprite). Collision shapes: 1 solid, 2–5 slopes (2 up along +x, 3 up along +z,
4 down along z, 5 down along x), 6–13 the four corner slopes split diagonally. A cell is 512 units across (0.87 m at
Twinsen's 1240 units = 2.1 m) and 256 high (0.43 m). Scenes: the island byte, the hero start, the actors (each
with its FILE3D entity → body), the zones (exits to other scenes). 120 rooms (grids 0–119; 120–134 are overlays).

| Scenes | What (island) |
|---|---|
| 0 | FunFrock's asylum on Citadel: grey brick halls, pipes, a staircase, an office with clone statues, the cells where LBA1 begins (Citadel) |
| 1 | the asylum seen from outside, its yard and the cliffs (Citadel) |
| 2, 3, 4, 116–118 | Citadel's town: the square, the fort, the beach paths (116–117 the end-of-game party, 118 the island's east) |
| 5 | Twinsen and Zoé's house: wooden floors, arched doorways, a fireplace corner with armchairs, a round table, a long kitchen, two bedrooms, a bathroom (Citadel) |
| 6, 11 | the harbours (Citadel, Principal Island) |
| 7, 26, 27, 30, 32, 50 | shops, a bar, stores (sandstone interiors) |
| 8, 21, 40, 41, 57 | dark dungeons and the spiked maze (the Temple of Bù's levels on White Leaf Desert) |
| 9, 62, 63, 65, 69, 71, 72, 82, 92, 96 | the Hamalayi Mountains' snow and ice |
| 10 | the library (Principal Island) |
| 12, 13, 18, 19, 42, 84, 94 | towns and yards (Principal Island, Proxima, Rebellion, Brundle) |
| 14 | a tavern with a balcony |
| 16, 20, 28, 29, 48, 52–54, 58, 61, 102, 103 | homes in the Citadel style: wood floors, curved arches, lamps, beds |
| 34, 38, 51, 55, 56, 74–77, 79, 85–87, 101 | sewers and stone cellars |
| 43 | the Maritime Museum (Proxima), two floors of display cases |
| 64, 66–68, 70, 83, 89, 95, 98, 99, 105 | FunFrock's fortresses and clone factories: grey halls, cloning machines, a room of clones in rows |
| 80 | the dance club with a stage and a dance floor |
| 106–110, 115 | the mine railways |
| 111–113 | the Well of Sendell |
| 114 | the stars at the end |
