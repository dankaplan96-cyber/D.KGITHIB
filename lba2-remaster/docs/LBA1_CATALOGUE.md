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
