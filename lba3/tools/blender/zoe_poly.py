# Zoé as a low-poly model after LBA2's in-game Zoé (Blender, headless; `pip install bpy`):
#   python tools/blender/zoe_poly.py art/characters/skeletons.json assets/poly [art/characters/zoe/zoe_poly.blend]
# (the skeleton file holds every character, as tools/dump-skeletons.mjs writes it; the output may be a folder or a
# .json file; the .blend is written only when named.)
#
# SRC-1 (docs/lba3-team/SOURCE_INVENTORY.md, docs/character-review.md §15). Identified in the user's own LBA2 files:
# BODY.HQR body 26 (File3D 15, generic body 0; body 27 is the same File3D's generic body 18), the object that speaks
# with LM_MESSAGE_ZOE and the engine's Zoé talk colour (COUL_ZOE 4) in scene 0, Twinsen's house. Every number below
# is a measurement of that body in fractions of its height H (1238 units to the top of the skull), taken with
# tools/lba-source/measure.py and contours.py; no original geometry, palette or animation is in this file or its output.
# Our own mesh on the game's own Zoé skeleton (unchanged), so every rig.js animation drives it.
#
# What it rebuilds that the earlier cast_poly.py build_zoe did not:
#   - her own head (the earlier one was Twinsen's head sections narrowed): a narrow face carried forward, a pointed
#     nose, wide red lips turned up at the corners, small dark slanted eyes under brown lids, blue earrings
#   - the outfit's colour layout: a shallow V in front (to 0.726 H), straps on the outer shoulders, an open back with a
#     red strap up the spine that forks to the shoulders (a halter), the necklace
#   - the original's colours: the palette ramps' mid shades the game shows (skin ramp 2, red ramp 4, shoes ramp 8)
#     and golden hair (palette 106) drawn flat like LBA2's sphere discs, not pale cream balls with highlights
#   - pointed hands (the forearm narrowing to a tip, as the original's), not balls
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402
from lbapoly import Builder, box, catmull, lerp, lip_band, loft, mouth_lens, ring, smooth, sphere, tube  # noqa: E402

args = [a for a in sys.argv[1:] if not a.endswith('.py')]
SKEL, OUT = args[0], args[1]
BLEND = args[2] if len(args) > 2 else None
if os.path.isdir(OUT) or not OUT.endswith('.json'):
    OUT = os.path.join(OUT, 'zoe.json')
ALL = json.load(open(SKEL))
S = ALL.get('zoe', ALL)
B = S['bones']
ZH = 1.95   # metres per H on the game's Zoé skeleton (hips 0.95, shoulders 1.47, neck 1.56, head 1.63)

# ---- colours: the original's palette ramp shades as the game's LbaMaterial shows them (vertex colour = the mid-lit
# shade, as for Twinsen: ramp shade ~9); hair: palette 106 drawn flat (see HAIR_UP)
COL = {
    'skin': '#d9a679',      # byte 32, ramp 2 (Twinsen's skin byte; his #e2bc90): a little warmer, so the pale end of our
                            # ramp stays warm skin in close-ups instead of chalk (the original's ramp: #9b6f57 → #fffbcf)
    'red': '#b32b27',       # byte 64, ramp 4 (dithered Gouraud): outfit and lips
    'shoe': '#3f7b47',      # byte 128, ramp 8
    'brown': '#8f634b',     # byte 30, ramp 1 shade 14: the eyelids and the shade under the nose
    'eye': '#2f474b',       # byte 181, solid
    'blue': '#1b4b67',      # byte 197: the necklace and earrings (lines in the original)
    'hair': '#cc8f00',      # renders #e3af6b with HAIR_UP (palette 106 #e3af53)
    # ZOE-OPEN (ours): the eyes' white (warm, not paper), iris and pupil, and the line between the lips
    'skinLine': '#a8744c',  # FACES-HANDS: the lines between the fingers (the skin, a quarter darker)
    'white': '#e9ded2', 'iris': '#3f7480', 'pupil': '#16272b', 'mouth': '#6a1a16',
}
# ZOE-LOOK-38 (CLOUD_ORDERS 38, the user 9.11: a softer, more expressive "animated feature" Zoé, as a candidate; from the
# order's words only, no picture): bigger lidded eyes with lashes and a catch-light, thin arched brows, a smaller nose,
# fuller lips; a tall golden ponytail swept up from the crown in a green band, its tip curled, over hair swept up from the
# face and the nape (the bald skull with a bun is gone); green trims at the top's neck and armholes, a black belt with a
# square silver buckle, a green cord necklace with a round dark pendant, green bangles, gold hoops; more segments on the
# head, the hair and the arms. Her body's sections (ZOE_BODY, SRC-2) are unchanged. ZOE_LOOK_OLD=1 builds the model as
# before (it rebuilds the shipped assets/poly/zoe.json exactly).
LOOK38 = not os.environ.get('ZOE_LOOK_OLD')
if LOOK38:
    COL.update({
        'hair': '#e3af53',      # (the LOOKS hair hex, now lit with real normals: the flat HAIR_UP disc look was for the balls)
        'trim': '#3f7b47',      # (the LOOKS shoes hex: the trims, the hair band, the cord, the bangles; no new role colour)
        'belt': '#2a2426', 'silver': '#c9ced4', 'gold': '#d6a23a', 'pendant': '#2d2833',
        'iris': '#3f6f9c',      # (blue, the order's words; the old teal read grey-green at the dialogue distance)
        'lidSkin': '#c3956d',   # (the skin x 0.9: the heavy upper lid)
        'lash': '#2a1a12', 'catch': '#fbf6ee', 'brow': '#5a3a22',   # (the brows a dark golden brown: the lid shade read faint)
    })
# A constant shade for the hair: with every normal straight up LbaMaterial gives t = n·L = 0.8 from any side
# (out = 1.025·base + 0.15 in linear light), the way LBA2 draws its spheres as flat unlit discs.
HAIR_UP = (0.0, 1.0, 0.0)

# ---- the body (groups 2 and 3: hips and torso), horizontal sections (y, half-width, front, back) in H, arms excluded.
# SRC-2 (the user: "Zoé needs to be made thinner. She isn't pregnant any more; the LBA2 character was pregnant"): in LBA2
# Zoé is expecting (Arthur, twelve years on, is their son). Body 26 carries it: a belly out to +0.144 at 0.555, the waist
# at ±0.072, the bust ±0.103 / +0.078, the top flaring to ±0.134 at its hem (0.428). Twelve years later she is not: the
# belly is gone (the front runs straight from the bust to the hem, 0.064-0.09), a natural waist (±0.068 at 0.620, the
# back a little in), hips ±0.103 at 0.50, the bust a touch smaller; the top keeps a slight flare at its hem (±0.122) and
# its layout (outfit_field), and the shoulders, neck and everything above 0.716 are the measured ones, unchanged.
# The pregnant sections (SRC-1's) are kept below as ZOE_BODY_LBA2 for the record and the rollback.
ZOE_BODY_LBA2 = [
    (0.404, 0.132, 0.118, -0.107), (0.428, 0.134, 0.122, -0.107), (0.452, 0.127, 0.127, -0.107), (0.476, 0.119, 0.131, -0.107),
    (0.500, 0.111, 0.118, -0.107), (0.524, 0.103, 0.115, -0.103), (0.548, 0.095, 0.11, -0.096), (0.572, 0.087, 0.104, -0.090),
    (0.596, 0.078, 0.096, -0.087), (0.620, 0.072, 0.086, -0.086), (0.644, 0.074, 0.070, -0.086), (0.668, 0.089, 0.073, -0.088),
    (0.692, 0.103, 0.078, -0.089), (0.716, 0.107, 0.069, -0.091), (0.740, 0.107, 0.050, -0.090), (0.764, 0.103, 0.030, -0.088),
    (0.788, 0.094, 0.012, -0.081), (0.806, 0.078, 0.0, -0.068), (0.818, 0.05, -0.008, -0.058), (0.826, 0.026, -0.012, -0.05),
]
ZOE_BODY = [
    (0.404, 0.122, 0.090, -0.098), (0.428, 0.121, 0.088, -0.098), (0.452, 0.116, 0.086, -0.097), (0.476, 0.110, 0.084, -0.095),
    (0.500, 0.103, 0.081, -0.093), (0.524, 0.096, 0.078, -0.090), (0.548, 0.088, 0.075, -0.086), (0.572, 0.080, 0.071, -0.082),
    (0.596, 0.073, 0.067, -0.079), (0.620, 0.068, 0.064, -0.078), (0.644, 0.071, 0.064, -0.080), (0.668, 0.086, 0.069, -0.084),
    (0.692, 0.099, 0.074, -0.087), (0.716, 0.105, 0.067, -0.090), (0.740, 0.107, 0.050, -0.090), (0.764, 0.103, 0.030, -0.088),
    (0.788, 0.094, 0.012, -0.081), (0.806, 0.078, 0.0, -0.068), (0.818, 0.05, -0.008, -0.058), (0.826, 0.026, -0.012, -0.05),
]
if os.environ.get('ZOE_LBA2'):   # (ZOE_LBA2=1: the measured, pregnant figure, as SRC-1 built it)
    ZOE_BODY = ZOE_BODY_LBA2
# each trouser leg: (y, centre x, radius across, front, back) — ±0.054 at the knee, ±0.038 at the ankle; the thighs
# slimmed with the body (SRC-2: front 0.112 → 0.09 at the hem, so the legs stay inside the narrower top)
ZOE_LEG = [(0.44, 0.06, 0.062, 0.088, -0.085), (0.404, 0.064, 0.062, 0.09, -0.086), (0.308, 0.065, 0.056, 0.084, -0.082), (0.212, 0.064, 0.052, 0.078, -0.077),
           (0.116, 0.065, 0.045, 0.05, -0.065), (0.05, 0.065, 0.039, 0.044, -0.056)]
if os.environ.get('ZOE_LBA2'):
    ZOE_LEG = [(0.44, 0.06, 0.066, 0.11, -0.1), (0.404, 0.066, 0.066, 0.112, -0.1), (0.308, 0.065, 0.059, 0.095, -0.09), (0.212, 0.064, 0.052, 0.078, -0.077),
               (0.116, 0.065, 0.045, 0.05, -0.065), (0.05, 0.065, 0.039, 0.044, -0.056)]
# the shoes: long and pointed, z −0.054 … +0.107, ±0.038 wide; sections (z, half-width, height)
ZOE_SHOE = [(-0.054, 0.03, 0.05), (-0.02, 0.036, 0.06), (0.03, 0.036, 0.05), (0.07, 0.026, 0.032), (0.107, 0.006, 0.01)]

# ---- the outfit's colour layout (landmarks of the red/skin boundary, H). Front: the V's point at (0, 0.726), its
# sides to (±0.053, 0.753), then up the straps' inner edge to the shoulder top (±0.086, 0.812); the strap covers the
# outer shoulder. Back: the spine strap is a narrow wedge from the dress (±0.043 at 0.618) to a point at (0, 0.726),
# where it forks into a band to each shoulder (lower edge (0, 0.726)–(±0.053, 0.779)–(±0.086, 0.812), upper edge
# (0, 0.779)–(±0.086, 0.812)); skin between it and the dress line (0.618) on either side, and above the band.
ZC = -0.012   # the body's mid-depth, where the front's layout gives way to the back's


def outfit_field(p):
    """> 0 skin, < 0 red; p in H."""
    x, y, z = p
    ax = abs(x)
    yv = 0.726 + 0.027 * ax / 0.053 if ax <= 0.053 else 0.753 + 0.059 * (ax - 0.053) / 0.033
    front = min(y - yv, 0.086 - ax)
    neck = min(y - (0.779 + 0.033 * ax / 0.086), 0.086 - ax)
    lower = 0.726 + ax if ax <= 0.053 else 0.779 + 0.033 * (ax - 0.053) / 0.033
    spine = 0.043 * (0.726 - y) / 0.108
    window = min(lower - y, ax - spine, y - (0.618 - 0.12 * max(0.0, ax - 0.043)))
    back = max(neck, window)
    strap = min(ax - 0.068, 0.112 - ax, y - 0.785)   # (the strap carried on over the shoulder's top to the back band)
    back = min(back, -strap)
    return front if z > ZC else back   # (the side seam: the strap ends there on the shoulder, the back band takes over)


# ---- her head (group 12), half-contours from the front centre round her left (+x) to the back centre, (x, z) in H
ZOE_HEAD_LBA2 = [   # (as measured; ZOE_HEAD_LBA2=1 builds SRC-1's head from it)
    (0.862, [(0.0, 0.0488), (0.0108, 0.04), (0.0183, 0.0322), (0.0245, 0.024), (0.0233, 0.0139), (0.0214, 0.005), (0.0192, -0.0053), (0.012, -0.03), (0.0, -0.045)]),
    (0.872, [(0.0, 0.0553), (0.0174, 0.0396), (0.0315, 0.029), (0.0355, 0.0123), (0.0324, -0.0025), (0.0298, -0.0148), (0.0268, -0.0293), (0.0174, -0.0445), (0.0, -0.0602)]),
    (0.882, [(0.0, 0.0582), (0.0204, 0.0431), (0.0359, 0.0299), (0.0439, 0.0122), (0.0416, -0.006), (0.0384, -0.0219), (0.0347, -0.0407), (0.0211, -0.057), (0.0, -0.0702)]),
    (0.892, [(0.0, 0.0628), (0.0227, 0.0462), (0.0381, 0.0294), (0.0474, 0.0109), (0.0512, -0.0087), (0.0473, -0.0283), (0.0428, -0.0515), (0.0235, -0.0656), (0.0, -0.0802)]),
    (0.902, [(0.0, 0.0676), (0.0221, 0.0427), (0.0392, 0.0286), (0.0479, 0.0092), (0.0528, -0.0106), (0.0488, -0.0308), (0.0439, -0.0545), (0.0257, -0.0728), (0.0, -0.0888)]),
    (0.912, [(0.0, 0.0626), (0.0232, 0.0387), (0.0405, 0.0232), (0.0505, 0.0035), (0.0523, -0.0174), (0.049, -0.0376), (0.0415, -0.0589), (0.025, -0.0777), (0.0, -0.0973)]),
    (0.922, [(0.0, 0.0576), (0.026, 0.0386), (0.0426, 0.0185), (0.0505, -0.0032), (0.0517, -0.0241), (0.0491, -0.0444), (0.0391, -0.0633), (0.0236, -0.081), (0.0, -0.1058)]),
    (0.932, [(0.0, 0.0522), (0.0299, 0.0451), (0.0434, 0.0163), (0.0497, -0.0065), (0.0508, -0.0271), (0.0499, -0.0478), (0.0385, -0.0656), (0.0232, -0.0831), (0.0, -0.1063)]),
    (0.942, [(0.0, 0.0443), (0.0265, 0.0342), (0.044, 0.0144), (0.0488, -0.0094), (0.05, -0.0296), (0.0509, -0.0507), (0.0379, -0.0676), (0.0218, -0.0824), (0.0, -0.1036)]),
    (0.952, [(0.0, 0.0365), (0.0244, 0.0267), (0.0453, 0.0131), (0.048, -0.0123), (0.0491, -0.0322), (0.049, -0.0525), (0.0349, -0.0671), (0.0201, -0.0807), (0.0, -0.1009)]),
    (0.962, [(0.0, 0.0287), (0.0225, 0.0196), (0.0445, 0.0098), (0.0457, -0.0158), (0.0455, -0.0348), (0.0453, -0.0535), (0.0318, -0.0666), (0.0185, -0.0793), (0.0, -0.0982)]),
    (0.972, [(0.0, 0.0208), (0.0204, 0.0119), (0.0328, -0.0046), (0.0421, -0.0199), (0.0419, -0.0373), (0.0413, -0.0545), (0.0288, -0.0661), (0.0169, -0.0782), (0.0, -0.0955)]),
    (0.982, [(0.0, 0.0024), (0.0131, -0.0135), (0.0214, -0.0238), (0.0285, -0.0334), (0.0373, -0.0452), (0.0332, -0.0589), (0.0236, -0.0687), (0.0139, -0.0786), (0.0, -0.0928)]),
    (0.990, [(0.0, -0.032), (0.0084, -0.037), (0.0136, -0.042), (0.0182, -0.0465), (0.0225, -0.052), (0.02, -0.058), (0.0143, -0.0635), (0.0083, -0.069), (0.0, -0.076)]),
]
CHIN, CROWN = (0.0, 0.852, 0.022), (0.0, 0.995, -0.054)
# (ours, not measured: the 0.862 ring's back half (the cut there misses the back of the jaw) and the 0.990 ring, which
# rounds the crown between the last measured cut and the top)
# the face (H; x ≥ 0 side, mirrored): lips (red) a wide crescent, corners up; under the nose tip (0, 0.898) the
# original has a brown shade to the cheeks (not built, see below); eyes small dark slants under brown lids
LIPS_TOP = [(-0.037, 0.888), (-0.018, 0.879), (0.0, 0.876), (0.018, 0.879), (0.037, 0.888)]
LIPS_LOW = [(-0.037, 0.888), (-0.02, 0.869), (0.0, 0.860), (0.02, 0.869), (0.037, 0.888)]
UNDERNOSE = [[(-0.037, 0.888), (0.0, 0.888), (0.0, 0.898)], [(0.0, 0.898), (0.0, 0.888), (0.037, 0.888)]]
LID = [(0.014, 0.929), (0.022, 0.935), (0.044, 0.940), (0.043, 0.935)]   # (the original's lid runs from the bridge up and out at a steep slant; ours stops at the eye and is flatter: in our light the pair read as a frown)
EYE = [(0.015, 0.926), (0.026, 0.935), (0.042, 0.934), (0.031, 0.923)]
EARRING = [(0.054, 0.909, -0.036), (0.054, 0.882, -0.026), (0.054, 0.882, -0.048)]
NECKLACE = [(0.021, 0.834, -0.054), (0.048, 0.807, -0.001), (0.032, 0.780, 0.027), (0.0, 0.758, 0.037)]
# ZOE-OPEN (CHAR-2; the user on the opening: "Zoé looks terrible in the video": angular face planes, a flat profile;
# BUILD109_REVIEW §4). The measured cuts above make a wedge: every section comes to a point at the front, so one ridge
# runs from the chin over the "nose" to the forehead, with no brow, nose or chin of its own and hard planes either
# side. Her head is now built from designed sections at the same size and place (the widths, the long skull carried
# back, the crown and the bun's seat are the measured ones): a face front that is broad and gently curved, a brow over
# the eyes, cheekbones, a small rounded chin and a jaw that narrows to it; the nose is its own small part. Identity
# kept: narrow face carried forward, pointed nose, red lips turned up at the corners, slanted eyes, golden bun.
#   (y, half-width, z where widest, front centre z, back centre z, front exponent: < 1 flatter across the face)
ZOE_HEAD_DESIGN = [
    (0.859, 0.017, 0.008, 0.037, -0.024, 1.0),
    (0.866, 0.026, 0.004, 0.0495, -0.040, 0.9),
    (0.874, 0.0345, 0.0, 0.0515, -0.055, 0.85),
    (0.882, 0.0415, -0.004, 0.0545, -0.066, 0.8),
    (0.890, 0.0465, -0.008, 0.0575, -0.076, 0.75),
    (0.899, 0.0490, -0.010, 0.0585, -0.085, 0.7),
    (0.909, 0.0505, -0.013, 0.0575, -0.094, 0.65),
    (0.919, 0.0512, -0.015, 0.0555, -0.100, 0.62),
    (0.929, 0.0516, -0.017, 0.0535, -0.104, 0.62),
    (0.939, 0.0520, -0.019, 0.0555, -0.105, 0.62),
    (0.949, 0.0515, -0.023, 0.0515, -0.104, 0.66),
    (0.959, 0.0490, -0.027, 0.0445, -0.101, 0.75),
    (0.969, 0.0425, -0.031, 0.0335, -0.098, 0.85),
    (0.978, 0.0360, -0.037, 0.0165, -0.094, 0.9),
    (0.986, 0.0270, -0.045, -0.0065, -0.087, 1.0),
    (0.992, 0.0150, -0.053, -0.0330, -0.074, 1.0),
]
CHIN2 = (0.0, 0.854, 0.014)


def head_design():
    out = []
    for y, w, zs, f, bk, pf in ZOE_HEAD_DESIGN:
        half = []
        for k in range(25):
            t = math.pi * k / 24
            sn, cs = math.sin(t), math.cos(t)
            x = w * sn ** 0.92
            z = zs + (f - zs) * cs ** pf if cs >= 0 else zs - (zs - bk) * (-cs) ** 0.9
            half.append((x, z))
        out.append((y, half))
    return out


# the nose: a small pointed wedge of its own on the face (H): the bridge between the eyes, the tip, the wings, the
# underside (the tip as far forward as the original's, +0.075 against its +0.069 on a face 0.01 further back)
#   (y, how far the ridge stands off the face, half-width): the tip 0.014 H proud at 0.9035 (z ≈ 0.073; pointed, as hers)
NOSE_ROWS = [(0.9275, 0.0, 0.0042), (0.921, 0.0032, 0.0050), (0.914, 0.0068, 0.0057), (0.908, 0.0108, 0.0068),
             (0.9035, 0.0142, 0.0080), (0.9003, 0.0118, 0.0105), (0.8975, 0.0058, 0.0118), (0.8962, 0.0, 0.0095)]
# the lips: a smaller mouth (the measured crescent ran from cheek to cheek and down to the chin, a slash across the
# face), upper and lower lip and the line between, corners up (her smile); x >= 0, mirrored
LIPS2_TOP = [(0.0, 0.8912), (0.004, 0.8918), (0.0125, 0.8905), (0.0235, 0.8877)]
LIPS2_MID = [(0.0, 0.8866), (0.004, 0.8866), (0.0125, 0.8868), (0.0235, 0.8877)]
LIPS2_LOW = [(0.0, 0.8812), (0.004, 0.8813), (0.0125, 0.8826), (0.0235, 0.8877)]
# the eyes: a white almond (outer corner raised: her slant) with a teal iris and a dark pupil, so the eye shape and the
# gaze read at the opening's distances (the measured dark slits under brown lids read as closed eyes); a brown lid
# line over the top with a small flick at the outer corner, and a thin brow
EYE2 = (0.0265, 0.9285, 0.0098, 0.0052, 0.11)       # centre x, y, half-width, half-height, slant (rise per unit x)
BROW = [(0.0105, 0.9425), (0.0195, 0.9465), (0.0300, 0.9475), (0.0405, 0.9445)]
# the earrings: a blue teardrop hoop (the original's are line triangles; the triangle frame read as a hard shape)
EAR2 = (0.0535, 0.9035, -0.024, 0.0068, 0.0185)   # x, hook y, z, hoop radius, drop (hook to bottom)
if LOOK38:
    # ZOE-LOOK-38, the face: a smaller nose (the ridge 0.72 as proud, 0.85 as wide, the tip a touch up); fuller lips
    # (taller, a small bow in the upper lip, a little narrower, the lower one fuller and further out); bigger eyes (1.2 x
    # as wide, 1.45 x as tall, a larger blue iris with a catch-light) under a heavy upper lid with a lash line and three
    # lashes at the outer corner; thin, higher, arched brows; round gold hoops
    NOSE_ROWS = [(0.9265, 0.0, 0.0036), (0.9205, 0.0023, 0.0043), (0.9145, 0.0049, 0.0049), (0.9090, 0.0078, 0.0058),
                 (0.9050, 0.0103, 0.0068), (0.9018, 0.0086, 0.0089), (0.8990, 0.0042, 0.0100), (0.8975, 0.0, 0.0081)]
    LIPS2_TOP = [(0.0, 0.8921), (0.0045, 0.8930), (0.0110, 0.8920), (0.0218, 0.8879)]
    LIPS2_MID = [(0.0, 0.8866), (0.0045, 0.8866), (0.0110, 0.8868), (0.0218, 0.8879)]
    LIPS2_LOW = [(0.0, 0.8796), (0.0050, 0.8798), (0.0120, 0.8813), (0.0218, 0.8879)]
    EYE2 = (0.0275, 0.9290, 0.0118, 0.0076, 0.09)
    BROW = [(0.0120, 0.9452), (0.0200, 0.9502), (0.0300, 0.9522), (0.0400, 0.9503), (0.0455, 0.9462)]
    EAR2 = (0.0535, 0.9035, -0.024, 0.0090, 0.0)       # (x, hook y, z, hoop radius: a round hoop, no teardrop)
# the bun: three spheres (centre y, z, r) on the three bun groups, drawn flat; built as one mass like Twinsen's (VP-1b)
# CHAR-OPEN (OPEN-3 #11): as measured (ZOE_BUN_LBA2) the first ball only grazes the back of the crown and the other two
# hang 0.03-0.05 H behind the skull; carried by the tail bones, the follow-through then swung the mass off the head
# and in profile it floated with bare scalp between. Now the same three balls (same sizes, same downward-backward
# run) are seated on the skull: the first sunk into the crown's back, the second and third against the back of the
# head; and the whole bun is on the head bone (a bun is pinned hair: it does not swing like a tail).
ZOE_BUN_LBA2 = ((1.001, -0.135, 0.052), (0.974, -0.188, 0.037), (0.937, -0.204, 0.026))
ZOE_BUN = ((0.982, -0.108, 0.052), (0.953, -0.146, 0.037), (0.921, -0.140, 0.026))
BUN_FILL = 0.7
BUN_M = 12

bp = lambda n: tuple(B[n]['p'])
m = lambda p: tuple(c * ZH for c in p)
bpy.ops.wm.read_factory_settings(use_empty=True)
b = Builder('zoe', B)


# ------------------------------------------------------------------ the dress and bare skin: one loft, split by colour
def w_body(p):
    x, y, z = p
    hips = 1 - smooth(0.5 * ZH, 0.58 * ZH, y)
    arm = smooth(0.08 * ZH, 0.11 * ZH, abs(x)) * smooth(0.72 * ZH, 0.78 * ZH, y)
    neck = smooth(0.80 * ZH, 0.83 * ZH, y)
    s_ = 'L' if x > 0 else 'R'
    w = {'hips': hips * (1 - arm), 'torso': (1 - hips) * (1 - arm) * (1 - neck), 'neck': neck * (1 - arm)}
    if arm > 0:
        w['sh' + s_] = arm
    return {k: v for k, v in w.items() if v > 0}


def sec(y):
    for a, c in zip(ZOE_BODY, ZOE_BODY[1:]):
        if a[0] <= y <= c[0]:
            t = (y - a[0]) / (c[0] - a[0])
            return tuple(a[k] + (c[k] - a[k]) * t for k in range(1, 4))
    return ZOE_BODY[-1][1:]


def split_loft(rings, field, pa, pb):
    """Loft the rings; each quad is cut along field = 0 (linear on its edges): the > 0 side goes to pa, the rest to pb.
    Corners are shared within each part (welded by position), so the shading stays smooth across the quads."""
    n = len(rings[0])
    idx = {id(pa): {}, id(pb): {}}

    def vid(part, v):
        k = tuple(round(c, 6) for c in v)
        d = idx[id(part)]
        if k not in d:
            d[k] = len(part.v)
            part.v.append(k)
        return d[k]
    for j in range(len(rings) - 1):
        for i in range(n):
            q = [rings[j][i], rings[j][(i + 1) % n], rings[j + 1][(i + 1) % n], rings[j + 1][i]]
            f = [field(tuple(c / ZH for c in v)) for v in q]
            for part, sgn in ((pa, 1), (pb, -1)):
                poly = []
                for k in range(4):
                    v0, v1, f0, f1 = q[k], q[(k + 1) % 4], sgn * f[k], sgn * f[(k + 1) % 4]
                    if f0 >= 0:
                        poly.append(v0)
                    if (f0 >= 0) != (f1 >= 0):
                        a_, c_ = (v0, v1) if (v0 < v1) else (v1, v0)          # (the same point from either quad)
                        fa, fc = (f0, f1) if (v0 < v1) else (f1, f0)
                        t = fa / (fa - fc)
                        poly.append(tuple(x + (y - x) * t for x, y in zip(a_, c_)))
                if len(poly) >= 3:
                    ids = [vid(part, v) for v in poly]
                    ids = [x for k, x in enumerate(ids) if x not in ids[:k]]
                    if len(ids) >= 3:
                        part.f.append(ids)


def ring_quads(rings):
    n = len(rings[0])
    return [[rings[j][i], rings[j][(i + 1) % n], rings[j + 1][(i + 1) % n], rings[j + 1][i]] for j in range(len(rings) - 1) for i in range(n)]


def split_polys(polys, cuts, rest):
    """ZOE-LOOK-38: split_loft for any polygons and several colours. cuts = [(field, part)], in order: each polygon's
    piece where field > 0 (field of a point in H, linear on the edges) goes to that part, what is left goes on to the next
    cut, and what is left after the last one to `rest`. Cut points are computed from an edge's ends in a fixed order, so
    neighbours share them, and corners are welded per part (smooth shading across the cuts)."""
    idx = {}

    def vid(part, v):
        k = tuple(round(c, 6) for c in v)
        d = idx.setdefault(id(part), {})
        if k not in d:
            d[k] = len(part.v)
            part.v.append(k)
        return d[k]

    def emit(part, poly):
        if len(poly) >= 3:
            ids = [vid(part, v) for v in poly]
            ids = [x for k, x in enumerate(ids) if x not in ids[:k]]
            if len(ids) >= 3:
                part.f.append(ids)

    def clip(poly, fv, sgn):
        out, n = [], len(poly)
        for k in range(n):
            v0, v1, f0, f1 = poly[k], poly[(k + 1) % n], sgn * fv[k], sgn * fv[(k + 1) % n]
            if f0 >= 0:
                out.append(v0)
            if (f0 >= 0) != (f1 >= 0):
                a_, c_ = (v0, v1) if (v0 < v1) else (v1, v0)
                fa, fc = (f0, f1) if (v0 < v1) else (f1, f0)
                t = fa / (fa - fc)
                out.append(tuple(round(x + (y - x) * t, 7) for x, y in zip(a_, c_)))
        return out
    for poly in polys:
        cur = [tuple(v) for v in poly]
        for field, part in cuts:
            if len(cur) < 3:
                break
            fv = [field(tuple(c / ZH for c in v)) for v in cur]
            emit(part, clip(cur, fv, 1))
            cur = clip(cur, fv, -1)
        emit(rest, cur)


# ZOE-LOOK-38: the top's edges in a wide green trim (the neck's V, the straps and the open back's edges: one trim round
# every edge of the top), cut into the same loft as a third colour (no new geometry beyond the cuts): 0.011 H (2.1 cm)
# wide in front, 0.006 H behind, where the halter's straps are narrow
TRIM_W = lambda p: 0.011 if p[2] > ZC else 0.006
ys = [0.404 + 0.014 * k for k in range(int((0.818 - 0.404) / 0.014) + 1)] + [0.818, 0.826]
ys = sorted(set(round(y, 4) for y in ys))
NB = 32
body_rings = [ring(y * ZH, sec(y)[0] * ZH, sec(y)[1] * ZH, sec(y)[2] * ZH, NB, 0.72) for y in ys]
skin = b.P('skin', COL['skin'], w_body, 50)
dress = b.P('dress', COL['red'], w_body, 50)
if LOOK38:
    trimP = b.P('trim', COL['trim'], w_body, 50)
    split_polys(ring_quads(body_rings), [(outfit_field, skin), (lambda p: outfit_field(p) + TRIM_W(p), trimP)], dress)
else:
    split_loft(body_rings, outfit_field, skin, dress)

# ZOE-LOOK-38: the belt at her natural waist (0.610-0.630 H), black, 4 mm proud, with a lip turned in at the top and
# the foot (thickness, no paper edge), and a square silver buckle in front (a frame of four bars round the belt)
if LOOK38:
    BELT = (0.609, 0.631, 0.0042)   # (foot, top, how far proud: m)

    def belt_ring(y, o):
        hw, zf, zb = sec(y)
        return ring(y * ZH, hw * ZH + o, zf * ZH + o, zb * ZH - o, NB, 0.72)
    beltP = b.P('belt', COL['belt'], w_body, 40)
    loft(beltP, [belt_ring(BELT[0], 0.0004), belt_ring(BELT[0], BELT[2]), belt_ring(BELT[1], BELT[2]), belt_ring(BELT[1], 0.0004)])
    bk = b.P('buckle', COL['silver'], w_body, 30)
    by, bz = (BELT[0] + BELT[1]) / 2 * ZH, sec((BELT[0] + BELT[1]) / 2)[1] * ZH + BELT[2]
    BO, BI, BD = 0.0225, 0.0125, 0.0045   # (outer half, inner half, depth: m)
    for x0, x1, y0, y1 in ((-BO, BO, BI, BO), (-BO, BO, -BO, -BI), (-BO, -BI, -BI, BI), (BI, BO, -BI, BI)):
        box(bk, x0, x1, by + y0, by + y1, bz - 0.001, bz + BD)

# ------------------------------------------------------------------ the trouser legs and the long pointed shoes
for s_, sx in (('L', 1), ('R', -1)):
    hp, kn = bp('hip' + s_), bp('knee' + s_)

    def w_leg(p, s_=s_, kn=kn):
        y = p[1]
        top = smooth(0.47 * ZH, 0.4 * ZH, y)
        knee = smooth(kn[1] + 0.06, kn[1] - 0.06, y)
        return {k: v for k, v in (('hips', 1 - top), ('hip' + s_, top * (1 - knee)), ('knee' + s_, top * knee)) if v > 0}
    leg = b.P('leg' + s_, COL['red'], w_leg, 50)
    loft(leg, [ring(y * ZH, r * ZH, zf * ZH, zb * ZH, 12, 0.8, cx=sx * max(hp[0], cx * ZH * 0.8)) for y, cx, r, zf, zb in reversed(ZOE_LEG)], cap_bottom=True)
    sh = b.P('shoe' + s_, COL['shoe'], 'foot' + s_, 40)
    x0 = sx * max(hp[0], 0.065 * ZH * 0.8)
    rr = [[(x0 + hw * ZH * math.cos(2 * math.pi * k / 8), 0.004 + h * ZH * 0.5 * (1 + math.sin(2 * math.pi * k / 8)), z * ZH) for k in range(8)] for z, hw, h in ZOE_SHOE]
    vv = [p for r in rr for p in r]
    ff = [[j * 8 + i, j * 8 + (i + 1) % 8, (j + 1) * 8 + (i + 1) % 8, (j + 1) * 8 + i] for j in range(len(rr) - 1) for i in range(8)]
    vv.append(tuple(sum(p[k] for p in rr[0]) / 8 for k in range(3)))
    ff += [[(i + 1) % 8, i, len(vv) - 1] for i in range(8)]
    vv.append(tuple(sum(p[k] for p in rr[-1]) / 8 for k in range(3)))
    ff += [[len(vv) - 1, (len(rr) - 1) * 8 + i, (len(rr) - 1) * 8 + (i + 1) % 8] for i in range(8)]
    sh.add(vv, ff)

# ------------------------------------------------------------------ bare arms, the forearm narrowing to the hand
# CHAR-OPEN (OPEN-3 #28): the arms were two straight tubes (r 0.031 → 0.026 → 0.020 m: 6 cm across at the shoulder,
# rods next to her 0.4 m bust). Now a slim adult arm in sections along the bones: a rounded shoulder cap sunk into the
# body's shoulder, the upper arm 9-10 cm across tapering to the elbow, a small swell of the forearm below it and a 5 cm
# wrist into the mitten hand; a little deeper than wide (front to back), as arms are. Slim like her body (SRC-2), not
# muscular. The skeleton and the bones' weights are the same as before (sh above the elbow, el below, blended there).
# ZOE-OPEN (CHAR-2; the user: "a long thin stick arm", BUILD109_REVIEW §4: forearms and hands under-articulated): 12
# sides (10 read as facets in the tap close-up); the elbow a little deeper than wide (its point behind), the forearm
# swelling just below it and narrowing to a wrist that is wider (thumb to little finger, front to back at rest) than
# thick, so the forearm turns flat into the hand instead of running on as a rod.
ARM = [   # (u along the arm: 0 the shoulder, 0.5 the elbow, 1 the wrist; half-width across, half-depth; metres)
    (-0.06, 0.032, 0.034), (0.0, 0.046, 0.047), (0.1, 0.05, 0.05), (0.27, 0.046, 0.047), (0.42, 0.038, 0.040),
    (0.5, 0.034, 0.038), (0.58, 0.038, 0.041), (0.66, 0.041, 0.042), (0.8, 0.033, 0.036), (0.93, 0.023, 0.029),
    (1.0, 0.0195, 0.026),
]
ARMHOLE = (-0.06, 0.0)           # (ZOE-LOOK-38: the armhole trim along the arm, u)
BANGLE = (0.86, 0.90, 0.0045)     # (ZOE-LOOK-38: the bangle along the forearm, u, and how far it stands off the skin: m)
ARM_N = 14 if LOOK38 else 12   # (ZOE-LOOK-38: 14 sides, a rounder arm outline)


def build_hand(part, el, hd, sx, lines=None):
    """ZOE-OPEN: a hand that reads at the opening's tap close-up, in place of the flat paddle (the original's forearm
    narrows to a long point; SRC-1 made it a short flattened mitten, which read as a stick's end). A palm a little
    wider than the wrist, the four fingers as one mitten curling gently toward the palm, and a thumb of its own on the
    front side (at rest the palm faces her thigh, the thumb forward), so the hand has a direction and a grip. About
    12 cm from the wrist to the fingertips, slim like her arms. All on the hand bone, as before."""
    d = (hd - el).normalized()
    palm = Vector((-sx, 0.0, 0.0))                      # (toward her middle at rest)
    palm = (palm - d * palm.dot(d)).normalized()
    wv = palm.cross(d).normalized()
    if wv.z < 0:
        wv = -wv                                         # (the thumb's side: forward at rest)
    NH = 10

    def sec(c, ax, hw, ht, sq=0.7):
        # a section across the hand at c: half-width along wv, half-thickness along the palm normal, rounded box;
        # ax is the hand's axis there (the curl turns it toward the palm)
        nrm = (palm - ax * palm.dot(ax)).normalized()
        w2 = nrm.cross(ax).normalized()
        if w2.dot(wv) < 0:
            w2 = -w2
        out = []
        for i in range(NH):
            t = 2 * math.pi * i / NH
            s, c_ = math.sin(t), math.cos(t)
            out.append(tuple(c + w2 * (math.copysign(abs(c_) ** sq, c_) * hw) + nrm * (math.copysign(abs(s) ** sq, s) * ht)))
        return out
    # (distance along the hand, curl toward the palm in degrees, half-width, half-thickness, offset toward the palm)
    STA = [(-0.010, 0, 0.0235, 0.0175, 0.0), (0.012, 0, 0.0275, 0.015, 0.001), (0.040, 0, 0.030, 0.0125, 0.002),
           (0.064, 4, 0.0295, 0.0112, 0.002), (0.085, 16, 0.027, 0.0098, 0.0), (0.103, 30, 0.0235, 0.0088, 0.0),
           (0.116, 44, 0.018, 0.0078, 0.0), (0.123, 56, 0.011, 0.0062, 0.0)]
    rings, p, prev_s, ax, fr = [], hd + d * STA[0][0], STA[0][0], d, []
    for s, curl, hw, ht, off in STA:
        a = math.radians(curl)
        ax = (d * math.cos(a) + palm * math.sin(a)).normalized()
        p = p + ax * (s - prev_s)
        prev_s = s
        rings.append(sec(p + palm * off, ax, hw, ht))
        fr.append((p + palm * off, ax, hw, ht))
    # winding: outward
    loft(part, rings, cap_bottom=False, cap_top=True)
    f0 = part.f[NH]
    a_, b_, c_ = (Vector(part.v[i]) for i in f0[:3])
    cen = sum((Vector(part.v[i]) for i in f0), Vector()) / len(f0)
    o0 = len(part.v) - (len(rings) * NH + 1)
    axis_pt = Vector(tuple(sum(Vector(q)[k] for q in rings[1]) / NH for k in range(3)))
    if (b_ - a_).cross(c_ - a_).dot(cen - axis_pt) < 0:
        part.f = [list(reversed(f)) for f in part.f]
    # FACES-HANDS: the four fingers told apart. Three thin darker lines run along the mitten from the knuckles to the tips
    # on the palm side and on the back of the hand (laid 0.8 mm off the skin, a ribbon 1.8 mm wide), so in a close-up the
    # curl reads as fingers and not one blob; they add 36 triangles to a hand and cost no silhouette.
    if lines is not None:
        def lpt(k, f, side):
            c_, ax_, hw_, ht_ = fr[k]
            nrm_ = (palm - ax_ * palm.dot(ax_)).normalized()
            w2_ = nrm_.cross(ax_).normalized()
            if w2_.dot(wv) < 0:
                w2_ = -w2_
            cc_ = math.copysign(abs(f) ** (1 / 0.7), f)
            ss_ = side * math.sqrt(max(0.0, 1 - cc_ * cc_))
            return c_ + w2_ * (f * hw_) + nrm_ * (math.copysign(abs(ss_) ** 0.7, ss_) * ht_ + side * 0.0008)
        for side in (1, -1):
            for f in (-0.5, 0.0, 0.5):
                for k in range(3, 6):
                    q = [lpt(k, f - 0.04, side), lpt(k, f + 0.04, side), lpt(k + 1, f + 0.04, side), lpt(k + 1, f - 0.04, side)]
                    ctr = sum(q, Vector()) / 4
                    c_, ax_, hw_, ht_ = fr[k]
                    v0, v1, v2 = q[0], q[1], q[2]
                    if (v1 - v0).cross(v2 - v0).dot(ctr - c_) < 0:
                        q.reverse()
                    lines.add([tuple(x) for x in q], [[0, 1, 2, 3]])
    # the thumb: from the palm's front edge near the wrist, out and forward, its tip turned toward the palm
    t0 = hd + d * 0.010 + wv * 0.017 + palm * 0.004
    dir1 = (d * 0.80 + wv * 0.42 + palm * 0.28).normalized()
    t1 = t0 + dir1 * 0.032
    dir2 = (d * 0.85 + wv * 0.08 + palm * 0.52).normalized()
    t2 = t1 + dir2 * 0.026
    k0 = len(part.f)
    th = []
    for c, r, ax in ((t0 - dir1 * 0.008, 0.0125, dir1), (t1, 0.0094, (dir1 + dir2).normalized()), (t2, 0.0068, dir2)):
        u = ax.cross(palm).normalized()
        w = ax.cross(u).normalized()
        th.append([tuple(c + u * (math.cos(2 * math.pi * i / 8) * r) + w * (math.sin(2 * math.pi * i / 8) * r * 0.85)) for i in range(8)])
    loft(part, th, cap_bottom=False, cap_top=True)
    f0 = part.f[k0 + 8]
    a_, b_, c_ = (Vector(part.v[i]) for i in f0[:3])
    cen = sum((Vector(part.v[i]) for i in f0), Vector()) / len(f0)
    if (b_ - a_).cross(c_ - a_).dot(cen - t1) < 0:
        part.f = part.f[:k0] + [list(reversed(f)) for f in part.f[k0:]]


for s_, sx in (('L', 1), ('R', -1)):
    shp, el, hd = bp('sh' + s_), bp('el' + s_), bp('hand' + s_)
    S0 = Vector((shp[0] - sx * 0.012, shp[1] + 0.012, shp[2] - 0.006))   # (the shoulder's top, inside the body's edge)
    E0, H0 = Vector(el), Vector(hd)

    def along(u, S0=S0, E0=E0, H0=H0):
        if u <= 0.5:
            return S0 + (E0 - S0) * (u / 0.5)
        return E0 + (H0 - E0) * ((u - 0.5) / 0.5)
    AU = {}

    def w_arm(p, s_=s_, AU=AU):
        u = AU[tuple(round(c, 6) for c in p)]
        e = smooth(0.42, 0.6, u)
        return {k: v for k, v in (('sh' + s_, 1 - e), ('el' + s_, e)) if v > 1e-4}
    arm = b.P('arm' + s_, COL['skin'], w_arm, 50)
    rings = []
    for u, ra, rd in ARM:
        c = along(u)
        d = (along(min(1.0, u + 0.06)) - along(max(-0.06, u - 0.06))).normalized()
        across = Vector((d.y, -d.x, 0.0)).normalized()
        dep = d.cross(across).normalized()
        if dep.z < 0:
            dep = -dep
        rr = [tuple(c + across * (math.cos(2 * math.pi * i / ARM_N) * ra) + dep * (math.sin(2 * math.pi * i / ARM_N) * rd)) for i in range(ARM_N)]
        for q in rr:
            AU[tuple(round(v, 6) for v in q)] = u
        rings.append(rr)
    loft(arm, rings, cap_bottom=True)
    AU[tuple(round(v, 6) for v in arm.v[-1])] = ARM[0][0]
    # faces outward (the sections' order decides the winding)
    f0 = arm.f[ARM_N]
    a_, b_, c_ = (Vector(arm.v[i]) for i in f0[:3])
    cen = sum((Vector(arm.v[i]) for i in f0), Vector()) / len(f0)
    if (b_ - a_).cross(c_ - a_).dot(cen - along(ARM[1][0])) < 0:
        arm.f = [list(reversed(f)) for f in arm.f]
    if LOOK38:
        # ZOE-LOOK-38: the armhole's green trim, a band round the top of the arm where it leaves the top (on the arm's
        # weights, so it rides the shoulder like a cap sleeve's edge), and a green bangle on the wrist (on the forearm)
        def arm_frame(u):
            c = along(u)
            d = (along(min(1.0, u + 0.06)) - along(max(-0.06, u - 0.06))).normalized()
            across = Vector((d.y, -d.x, 0.0)).normalized()
            dep = d.cross(across).normalized()
            if dep.z < 0:
                dep = -dep
            return c, d, across, dep

        def arm_r(u):
            for a_, c_ in zip(ARM, ARM[1:]):
                if a_[0] <= u <= c_[0]:
                    t = (u - a_[0]) / (c_[0] - a_[0])
                    return a_[1] + (c_[1] - a_[1]) * t, a_[2] + (c_[2] - a_[2]) * t
            return ARM[-1][1:]

        def band(part, u0, u1, out, n=ARM_N, au=None):
            rr = []
            for u, o in ((u0, 0.0003), (u0, out), (u1, out), (u1, 0.0003)):
                c, d, across, dep = arm_frame(u)
                ra, rd = arm_r(u)
                q = [tuple(c + across * (math.cos(2 * math.pi * i / n) * (ra + o)) + dep * (math.sin(2 * math.pi * i / n) * (rd + o))) for i in range(n)]
                if au is not None:
                    for v in q:
                        au[tuple(round(x, 6) for x in v)] = u
                rr.append(q)
            k0 = len(part.f)
            loft(part, rr)
            f0 = part.f[k0 + n]   # (the outer face: outward)
            a_, b_, c_ = (Vector(part.v[i]) for i in f0[:3])
            cen = sum((Vector(part.v[i]) for i in f0), Vector()) / len(f0)
            if (b_ - a_).cross(c_ - a_).dot(cen - arm_frame((u0 + u1) / 2)[0]) < 0:
                part.f = part.f[:k0] + [list(reversed(f)) for f in part.f[k0:]]
        band(b.P('armtrim' + s_, COL['trim'], w_arm, 50), ARMHOLE[0], ARMHOLE[1], 0.0032, au=AU)
        band(b.P('bangle' + s_, COL['trim'], 'el' + s_, 60), BANGLE[0], BANGLE[1], BANGLE[2], 12)
    el, hd = tuple(E0), tuple(H0)
    build_hand(b.P('hand' + s_, COL['skin'], 'hand' + s_, 55), Vector(el), Vector(hd), sx, b.P('fingers' + s_, COL['skinLine'], 'hand' + s_, 30))

# ------------------------------------------------------------------ neck and head
neckY, headY = bp('neck')[1], bp('head')[1]
neckP = b.P('neck', COL['skin'], lambda p: {'neck': 1 - smooth(headY - 0.02, headY + 0.04, p[1]), 'head': smooth(headY - 0.02, headY + 0.04, p[1])}, 60)
tube(neckP, (0, neckY - 0.05, -0.03), (0, 0.875 * ZH, -0.03), 0.042, 0.038, 12)   # (ZOE-OPEN: 12 sides, was 10)
NECK_CORD_K = 5   # (NECKLACE-ZOE: the cord's points per span between its control points)
# NECKLACE-ZOE (ours, H): behind, the cord rests on our neck just above the top of the body's shell, whose edge rises
# round the back of the neck to 0.826 H (the original's nape points are at its height, 0.834 H, but 3.5 cm further back,
# and its side points out on the shoulder): the nape, then the neck's side
NECK_CORD_BACK = [(0.012, 0.834, -0.036), (0.0235, 0.829, -0.012)]
HK = 15 if LOOK38 else 13   # points per half-contour after resampling (ZOE-LOOK-38: 15, 28 round the head, was 24)


def resample(half, k):
    seg = [math.dist(half[i], half[i + 1]) for i in range(len(half) - 1)]
    tot, out = sum(seg), []
    for j in range(k):
        dd, i = tot * j / (k - 1), 0
        while i < len(seg) - 1 and dd > seg[i]:
            dd -= seg[i]
            i += 1
        t = min(1, dd / seg[i]) if seg[i] else 0
        out.append((half[i][0] + (half[i + 1][0] - half[i][0]) * t, half[i][1] + (half[i + 1][1] - half[i][1]) * t))
    return out


# ZOE-LOOK-38: the hairline (H) by the angle round the head from the front (0) to the back (180 degrees): high on the
# forehead, down past the temples, behind where the ears would be (the earrings hang in front of it) and low at the nape
HAIRLINE = [(0, 0.958), (30, 0.956), (60, 0.949), (85, 0.937), (100, 0.925), (120, 0.905), (145, 0.889), (180, 0.881)]


def hairline(p):
    th = math.degrees(math.atan2(abs(p[0]), p[2] + 0.025))
    for (a0, y0), (a1, y1) in zip(HAIRLINE, HAIRLINE[1:]):
        if th <= a1:
            return y0 + (y1 - y0) * (th - a0) / (a1 - a0)
    return HAIRLINE[-1][1]


head_rings = []
for y, half in (ZOE_HEAD_LBA2 if os.environ.get('ZOE_HEAD_LBA2') else head_design()):
    h = resample(half, HK)
    head_rings.append([m((x, y, z)) for x, z in h] + [m((-x, y, z)) for x, z in reversed(h[1:-1])])
hpart = b.P('head', COL['skin'], 'head', 70)
if LOOK38:
    # ZOE-LOOK-38: her hair, swept up from the face, the temples and the nape to the tie at the crown: the head's own
    # sections cut along a hairline into skin and hair (one surface, no shell over a bald skull), the hair side raised
    # 3.5-5.5 mm off the skull (its thickness, rising from the hairline) and lit with real normals
    hpart_hair = b.P('hair', COL['hair'], 'head', 70)
    hair_field = lambda p: p[1] - hairline(p)
    HC = Vector(m((0.0, 0.935, -0.03)))
    for r in head_rings:
        for i, v in enumerate(r):
            f = hair_field(tuple(c / ZH for c in v))
            k = smooth(-0.003, 0.012, f)
            if k > 0:
                d = (Vector(v) - HC).normalized()
                lift = 0.0035 + 0.002 * smooth(0.95 * ZH, 0.99 * ZH, v[1])
                r[i] = tuple(round(c, 6) for c in (Vector(v) + d * (lift * k)))
    crown = Vector(m(CROWN)) + (Vector(m(CROWN)) - HC).normalized() * 0.0055
    n_ = len(head_rings[0])
    polys = ring_quads(head_rings)
    polys += [[head_rings[0][(i + 1) % n_], head_rings[0][i], m(CHIN2)] for i in range(n_)]
    polys += [[head_rings[-1][i], head_rings[-1][(i + 1) % n_], tuple(crown)] for i in range(n_)]
    split_polys(polys, [(hair_field, hpart_hair)], hpart)
    htree = BVHTree.FromPolygons([Vector(v) for v in hpart.v + hpart_hair.v], hpart.f + [[i + len(hpart.v) for i in f] for f in hpart_hair.f])
else:
    loft(hpart, head_rings)
    n_, o_ = len(head_rings[0]), len(hpart.v)
    hpart.add([m(CHIN if os.environ.get('ZOE_HEAD_LBA2') else CHIN2), m(CROWN)], [])
    hpart.f += [[(i + 1) % n_, i, o_] for i in range(n_)] + [[(len(head_rings) - 1) * n_ + i, (len(head_rings) - 1) * n_ + (i + 1) % n_, o_ + 1] for i in range(n_)]
# the face features lie on the head's surface: ray-cast from the front onto it
if not LOOK38:
    htree = BVHTree.FromPolygons([Vector(v) for v in hpart.v], hpart.f)


def on_face(x, y, lift=0.0025):
    hit = htree.ray_cast(Vector((x * ZH, y * ZH, 1.0)), Vector((0, 0, -1)))
    z = hit[0].z if hit[0] is not None else 0.05 * ZH
    return (x * ZH, y * ZH, z + lift)


def ccw(pts):
    """the polygon wound counter-clockwise seen from the front (+z), so its normal faces out"""
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    return list(pts) if a > 0 else list(reversed(pts))


def face_poly(part, pts, lift=0.0025, n=4):
    """A flat polygon (a triangle or a convex quad, x/y in H) laid on the face: an n x n grid, every point ray-cast
    onto the head, so it follows the curve of the face instead of cutting into it."""
    pts = ccw(pts)
    if len(pts) == 3:
        pts = pts + [pts[2]]
    grid = []
    for j in range(n + 1):
        v = j / n
        row = []
        for i in range(n + 1):
            u = i / n
            a = [pts[0][k] + (pts[1][k] - pts[0][k]) * u for k in range(2)]
            c = [pts[3][k] + (pts[2][k] - pts[3][k]) * u for k in range(2)]
            row.append(on_face(a[0] + (c[0] - a[0]) * v, a[1] + (c[1] - a[1]) * v, lift))
        grid.append(row)
    o = len(part.v)
    part.v += [p for r in grid for p in r]
    for j in range(n):
        for i in range(n):
            a, c = o + j * (n + 1) + i, o + (j + 1) * (n + 1) + i
            part.f.append([a, a + 1, c + 1, c] if len({grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]}) == 4
                          else [a, a + 1, c + 1])   # (a triangle's last row: its far edge is one point)


feat = lambda name, col: b.P(name, col, 'head', 20)
LBA2_FACE = bool(os.environ.get('ZOE_HEAD_LBA2'))


def strip(part, pts, thick, lift, up=(0.0, 1.0)):
    # a thin band along a polyline on the face (x/y in H), `thick` wide toward `up` (a lid line, a brow)
    for k in range(len(pts) - 1):
        a, c = pts[k], pts[k + 1]
        ta = thick * (0.55 if k == 0 else 1.0)
        tc = thick * (0.55 if k == len(pts) - 2 else 1.0)
        face_poly(part, [a, c, (c[0] + up[0] * tc, c[1] + up[1] * tc), (a[0] + up[0] * ta, a[1] + up[1] * ta)], lift, 1)


if LBA2_FACE:
    lips = feat('lips', COL['red'])
    lips.normal = (0.0, 0.15, 1.0)
    for k in range(len(LIPS_TOP) - 1):
        q = [LIPS_TOP[k], LIPS_TOP[k + 1], LIPS_LOW[k + 1], LIPS_LOW[k]]
        face_poly(lips, [p for i, p in enumerate(q) if p not in q[:i]], 0.003)
else:
    # the lips: upper and lower lip, one even shade (n·L ≈ 0.6 = the colour itself: the lower lip faces down, where
    # our ramp runs near-black), and the dark line between them
    lips = feat('lips', COL['red'])
    lips.normal = (0.0, 0.15, 1.0)
    full = lambda L: [(-x, y) for x, y in reversed(L[1:])] + list(L)
    T, M, Lo = full(LIPS2_TOP), full(LIPS2_MID), full(LIPS2_LOW)
    for k in range(len(T) - 1):
        for q, lift in (([T[k], T[k + 1], M[k + 1], M[k]], 0.0034), ([M[k], M[k + 1], Lo[k + 1], Lo[k]], 0.0040)):
            q = [p for i, p in enumerate(q) if p not in q[:i]]
            if len(q) >= 3:
                face_poly(lips, q, lift if LOOK38 else 0.003, 2)   # (ZOE-LOOK-38: the lower lip fuller, further out)
    # the line between the lips (FACES-HANDS: now her talking mouth). Its own small mesh on the head bone, drawn at its open
    # size, a dark lens set between the two lips (the lips stay on the face, red above and below it), and scaled in y by the
    # game to the same hair-thin line when she is silent (rest 0.16) and up while she speaks (rig.js, voice.js).
    # The lens is taller below the line than above (a jaw dropping under a still upper lip), and a red lower lip hangs from
    # it, so the open mouth keeps its red lips: when closed, the band is squashed flat inside the lower lip on the face.
    mouth_pivot, lens, mouth_tilt = mouth_lens(0.0, LIPS2_MID[0][1] * ZH, 0.0205 * ZH, 0.0072, 0.004, lambda x, y: on_face(x / ZH, y / ZH, 0.0)[2], 9, 0.0052, 0.5, 1.6)
    b.mouth(mouth_pivot, [(lens, COL['mouth']), (lip_band(lens, 0.0062), COL['red'])], rest=0.17, drop=-0.0012, tilt=mouth_tilt)
    # the nose (skin, on the head): its base points sunk a little into the face, the tip and the underside out of it
    # rows from the bridge down over the tip to the underside: each an arc across the nose from its left foot (sunk
    # into the face) over the ridge to the right foot, so the nose is rounded, not a cut-out wedge
    npart = b.P('nose', COL['skin'], 'head', 75)
    nrows = []
    for y, ridge, hw in NOSE_ROWS:
        row = []
        for k in range(7):
            ph = math.pi * (k / 6 - 0.5)
            x = hw * math.sin(ph)
            base = on_face(x, y, 0.0)
            row.append((base[0], base[1], base[2] - 0.0035 + ridge * ZH * abs(math.cos(ph)) ** 0.7))
        nrows.append(row)
    inner = Vector(m((0.0, 0.905, 0.035)))
    nf = []   # (shared corners, so the normals round off across the rows)
    for j in range(len(nrows) - 1):
        for k in range(6):
            f = [j * 7 + k, j * 7 + k + 1, (j + 1) * 7 + k + 1, (j + 1) * 7 + k]
            q = [nrows[i // 7][i % 7] for i in f]
            v0, v1, v2 = (Vector(x) for x in q[:3])
            if (v1 - v0).cross(v2 - v0).dot(sum((Vector(x) for x in q), Vector()) / 4 - inner) < 0:
                f.reverse()
            nf.append(f)
    npart.add([p for r in nrows for p in r], nf)
    # brows
    for sxx in (1, -1):
        strip(feat('brow', COL['brow' if LOOK38 else 'brown']), [(sxx * x, y) for x, y in BROW], 0.0021 if LOOK38 else 0.0024, 0.003)
for sxx in (1, -1):
    if LBA2_FACE:
        face_poly(feat('lid', COL['brown']), [(sxx * x, y) for x, y in LID], 0.004, 3)
        e = ccw([(sxx * x, y) for x, y in EYE])
        c = (sum(x for x, _ in e) / 4, sum(y for _, y in e) / 4)
        b.eye(on_face(*c, 0.005), [([on_face(x, y, 0.005) for x, y in e], COL['eye'])])
        ear = [m((sxx * x, y, z)) for x, y, z in EARRING]
        ep = b.P('earring', COL['blue'], 'head', 20)
        for k in range(3):
            tube(ep, ear[k], ear[(k + 1) % 3], 0.0035, 0.0035, 4)
        continue
    # the eye: an almond, its outer corner raised (the slant), the iris and pupil looking a touch inward and up; one
    # group per eye on the head bone (rig.js squashes it for the blink); the lid line stays on the head
    ex, ey, ew, eh, sl = EYE2
    cx = sxx * ex
    alm = lambda t: (cx + ew * math.cos(t), ey + eh * math.sin(t) * (1 - 0.18 * math.cos(t) * sxx) + sl * ew * math.cos(t) * sxx)
    white = [alm(2 * math.pi * k / 14) for k in range(14)]
    half_h = lambda x: eh * math.sqrt(max(0.0, 1 - ((x - cx) / ew) ** 2)) * 0.96
    ic = (cx - sxx * 0.0009, ey + 0.0004)

    def clipped(r, n):
        out = []
        for k in range(n):
            t = 2 * math.pi * k / n
            x, y = ic[0] + r * math.cos(t), ic[1] + r * math.sin(t)
            yc = ey + sl * (x - cx) * sxx
            h = half_h(x)
            out.append((x, min(max(y, yc - h), yc + h)))
        return out
    pv = on_face(cx, ey, 0.0042)
    if LOOK38:
        # ZOE-LOOK-38: the bigger eye, all in the eye's group (the blink squashes it whole, lid and lashes with it, to the
        # line across its middle): the white, a larger blue iris looking a touch inward, the pupil, a catch-light (the
        # same upper side on both eyes), a heavy upper lid in the skin's darker shade over the top of the white and the
        # iris, the lash line along its edge, thickening to a flick past the outer corner, three short lashes there
        top = lambda u: ey + eh * math.sqrt(max(0.0, 1 - u * u)) * (1 - 0.18 * u * sxx) + sl * ew * u * sxx
        mid = lambda u: ey + sl * ew * u * sxx
        edge = lambda u: mid(u) + (top(u) - mid(u)) * 0.5
        outer = lambda u: max(0.0, u * sxx)
        us = [sxx * (i / 8 * 2 - 1) for i in range(9)]          # (from the inner corner to the outer one)
        us.sort(key=lambda u: sxx * u)
        white = [alm(2 * math.pi * k / 18) for k in range(18)]
        ic = (cx - sxx * 0.0008, ey + 0.0006)
        lid_lo = [(cx + u * ew * 1.03, edge(u)) for u in us]
        lid_hi = [(cx + u * ew * 1.06, max(top(u), edge(u)) + 0.0016) for u in us]
        lash_lo = [(x, y - 0.0003) for x, y in lid_lo]
        lash_hi = [(x + sxx * 0.0022 * outer(u) ** 3, y + 0.0011 + 0.0013 * outer(u) ** 2) for (x, y), u in zip(lid_lo, us)]
        lash_lo.append((cx + sxx * ew * 1.30, ey + sl * ew * 1.2 + 0.0034))   # (the flick's point)
        lash_hi.append(lash_lo[-1])
        cl = (ic[0] - 0.0021, ic[1] + 0.0024)
        quads = [([on_face(x, y, 0.0042) for x, y in white], COL['white']),
                 ([on_face(x, y, 0.0050) for x, y in clipped(0.0064, 14)], COL['iris']),
                 ([on_face(x, y, 0.0056) for x, y in clipped(0.0030, 10)], COL['pupil']),
                 ([on_face(cl[0] + 0.0012 * math.cos(2 * math.pi * k / 6), cl[1] + 0.0012 * math.sin(2 * math.pi * k / 6), 0.0060) for k in range(6)], COL['catch']),
                 ([on_face(x, y, 0.0063) for x, y in lid_lo + list(reversed(lid_hi))], COL['lidSkin'], 'strip'),
                 ([on_face(x, y, 0.0067) for x, y in lash_lo + list(reversed(lash_hi))], COL['lash'], 'strip')]
        for u0 in (0.45, 0.68, 0.88):   # (the lashes: short dark wedges out and up from the lid's edge)
            u0 *= sxx
            bx, by_ = cx + u0 * ew, edge(u0) + 0.0008
            quads.append(([on_face(bx - 0.0008, by_, 0.0067), on_face(bx + 0.0008, by_, 0.0067),
                           on_face(bx + sxx * (0.0016 + 0.0022 * abs(u0)), by_ + 0.0036, 0.0067)], COL['lash']))
        b.eye(pv, quads)
        # the lid's crease on the face above it (stays when she blinks)
        crease = [(cx + u * ew * 0.95, top(u) + 0.0032 + 0.0006 * outer(u)) for u in us[1:]]
        strip(feat('crease', COL['brown']), crease, 0.0007, 0.0030)
    if not LOOK38:
      b.eye(pv, [([on_face(x, y, 0.0042) for x, y in white], COL['white']),
               ([on_face(x, y, 0.0050) for x, y in clipped(0.0049, 12)], COL['iris']),
               ([on_face(x, y, 0.0056) for x, y in clipped(0.0024, 8)], COL['pupil'])])
      # the lid line along the almond's upper edge, a small flick out past the outer corner
      upper = [alm(math.pi - math.pi * k / 6) if sxx > 0 else alm(math.pi * k / 6) for k in range(7)]
      upper = sorted(upper, key=lambda p: sxx * p[0])
      upper.append((upper[-1][0] + sxx * 0.0035, upper[-1][1] + 0.0022))
      strip(feat('lid', COL['brown']), upper, 0.0016, 0.0047)
    # the earring: a teardrop hoop hanging from the ear's place, in the head's side plane
    exx, ehy, ez, er, edrop = EAR2
    ctr_y = ehy - edrop + er
    NE = 12 if LOOK38 else 14   # (ZOE-LOOK-38: 12 segments round the smaller-section gold hoop)
    loop = []
    for k in range(NE):
        t = 2 * math.pi * k / NE
        if LOOK38:   # (ZOE-LOOK-38: a round gold hoop hanging from the hook, a little off the side of the head)
            loop.append(m((sxx * (exx + 0.0012), ehy - er + er * math.cos(t), ez + er * math.sin(t))))
            continue
        z, y = ez + er * math.sin(t), ctr_y - er * math.cos(t)
        s_top = max(0.0, -math.cos(t))            # (the upper half drawn in and up to the hook)
        z = ez + (z - ez) * (1 - 0.75 * s_top ** 1.5)
        y = y + s_top ** 1.5 * (ehy - (ctr_y + er))
        loop.append(m((sxx * exx, y, z)))
    ep = b.P('earring', COL['gold' if LOOK38 else 'blue'], 'head', 60)
    rings_e = []
    ER = 0.0028 if LOOK38 else 0.0032
    for k in range(NE):
        p0, pp, pn = Vector(loop[k]), Vector(loop[k - 1]), Vector(loop[(k + 1) % NE])
        tg = (pn - pp).normalized()
        u = Vector((1.0, 0.0, 0.0))
        w = tg.cross(u).normalized()
        rings_e.append([tuple(p0 + u * (math.cos(2 * math.pi * i / 4) * ER) + w * (math.sin(2 * math.pi * i / 4) * ER)) for i in range(4)])
    for k in range(NE):
        a_, c_ = rings_e[k], rings_e[(k + 1) % NE]
        mid_ = (Vector(loop[k]) + Vector(loop[(k + 1) % NE])) / 2
        for i in range(4):
            q = [a_[i], a_[(i + 1) % 4], c_[(i + 1) % 4], c_[i]]
            v0, v1, v2 = (Vector(x) for x in q[:3])
            if (v1 - v0).cross(v2 - v0).dot(sum((Vector(x) for x in q), Vector()) / 4 - mid_) < 0:
                q.reverse()
            ep.add(q, [[0, 1, 2, 3]])

# ------------------------------------------------------------------ the necklace: laid on the skin round the neck
NR = 0.0038 if LOOK38 else 0.0045   # (the cord's radius; ZOE-LOOK-38: a green cord, a little finer)
nk = b.P('necklace', COL['trim' if LOOK38 else 'blue'], lambda p: {'torso': 1 - smooth(0.80 * ZH, 0.84 * ZH, p[1]), 'neck': smooth(0.80 * ZH, 0.84 * ZH, p[1])}, 30)
if os.environ.get('ZOE_NECKLACE_OLD'):   # (the necklace before NECKLACE-ZOE, for comparison)
    btree = BVHTree.FromPolygons([Vector(v) for v in skin.v + dress.v], skin.f + [[i + len(skin.v) for i in f] for f in dress.f])
    pts = NECKLACE + [(-x, y, z) for x, y, z in reversed(NECKLACE[:-1])]
    lay = []
    for x, y, z in pts:
        o = Vector((0, y * ZH, -0.03))
        d = (Vector(m((x, y, z))) - o)
        d.y = 0
        hit = btree.ray_cast(o + d.normalized() * 0.3, -d.normalized())
        p = hit[0] + d.normalized() * 0.006 if hit[0] is not None else Vector(m((x, y, z)))
        lay.append(tuple(p))
    for k in range(len(lay) - 1):
        tube(nk, lay[k], lay[k + 1], 0.0045, 0.0045, 5)
else:
    # NECKLACE-ZOE (LBA3 Blender pass, 7.11.2026). The necklace was laid by casting at the skin and the dress only, not
    # at the neck (its own part): the two points behind the neck (0.834 H) found nothing and stayed where the original's
    # lines are, 3.5 cm behind our slimmer neck, and the loop was open there. In the close-ups two blue sticks stood out
    # in the air behind her neck. Now it is one closed cord round the base of her neck: the original's V in front (its
    # point and the collarbones as measured, NECKLACE), and behind, where our neck is slimmer than the original's, ours:
    # up the sides of the neck's base to the nape (NECK_CORD_BACK). A smooth closed curve through those points, each
    # of its points laid on the nearest of the neck, the skin and the dress (the cord's radius + 1.5 mm off the surface),
    # smoothed along the cord and laid again, and swept
    # as one 5-sided cord with no joints or end caps. The same colour, weights, width and one part as before.
    surf = [skin, dress, neckP] + ([trimP] if LOOK38 else [])   # (ZOE-LOOK-38: the neck's trim is part of the top's surface)
    sv, sf = [], []
    for part_ in surf:
        sf += [[i + len(sv) for i in f] for f in part_.f]
        sv += [Vector(v) for v in part_.v]
    btree = BVHTree.FromPolygons(sv, sf)
    half = NECK_CORD_BACK + NECKLACE[2:]                                       # nape L, side L, collarbone L, the V (H)
    ctrl = half + [(-x, y, z) for x, y, z in reversed(half[:-1])]              # … collarbone R, side R, nape R
    nC = len(ctrl)
    path = []
    for i in range(nC):   # (closed Catmull-Rom: the last span runs from the right nape point to the left one, behind the neck)
        a_, b_, c_, d_ = ctrl[(i - 1) % nC], ctrl[i], ctrl[(i + 1) % nC], ctrl[(i + 2) % nC]
        for j in range(NECK_CORD_K):
            t = j / NECK_CORD_K
            t2, t3 = t * t, t * t * t
            path.append(Vector(m(tuple(0.5 * (2 * b_[q] + (c_[q] - a_[q]) * t + (2 * a_[q] - 5 * b_[q] + 4 * c_[q] - d_[q]) * t2 + (3 * b_[q] - a_[q] - 3 * c_[q] + d_[q]) * t3) for q in range(3)))))
    CLEAR = NR + 0.0015

    def lay_on(p):
        # onto the nearest point of the neck, the skin or the dress, the cord's radius + 1.5 mm off it along the surface's
        # outward normal (outward: away from a point on the body's axis 15 cm below; a level ray to the axis, as before,
        # found the shoulders' far edge at the neck's base and carried the cord out to the shoulder corners)
        hit = btree.find_nearest(p)
        if hit[0] is None:
            return p
        q, nrm = Vector(hit[0]), Vector(hit[1])
        if nrm.dot(q - Vector((0, q.y - 0.15, -0.03))) < 0:
            nrm = -nrm
        return q + nrm * CLEAR
    lay = [lay_on(p) for p in path]
    for _ in range(4):   # (smooth along the cord, then back onto the body: no steps where it passes from the dress to the skin)
        n_ = len(lay)
        lay = [lay_on(lay[i] * 0.5 + (lay[(i - 1) % n_] + lay[(i + 1) % n_]) * 0.25) for i in range(n_)]
    nL = len(lay)
    ringsN = []
    for i, p in enumerate(lay):
        tng = (lay[(i + 1) % nL] - lay[(i - 1) % nL]).normalized()
        rad = Vector((p.x, 0.0, p.z + 0.03)); rad = (rad - tng * rad.dot(tng)).normalized()   # (out from the neck's axis)
        bi = tng.cross(rad).normalized()
        ringsN.append([tuple(p + rad * (NR * math.cos(2 * math.pi * k / 5)) + bi * (NR * math.sin(2 * math.pi * k / 5))) for k in range(5)])
    vN = [q for r in ringsN for q in r]
    fN = []
    for i in range(nL):
        j = (i + 1) % nL
        for k in range(5):
            k1 = (k + 1) % 5
            fN.append([i * 5 + k, j * 5 + k, j * 5 + k1, i * 5 + k1])
    # (outward: the first quad's normal away from the cord's centre line)
    q0 = [Vector(vN[i]) for i in fN[0]]
    if (q0[1] - q0[0]).cross(q0[2] - q0[0]).dot((q0[0] + q0[2]) / 2 - lay[0]) < 0:
        fN = [list(reversed(f)) for f in fN]
    nk.add(vN, fN, angle=75)
    if LOOK38:
        # ZOE-LOOK-38: a round dark pendant hanging from the cord's lowest point in front, a flat lens lying on the chest
        fr = max((p for p in lay if p.z > 0), key=lambda p: -p.y + 4 * -abs(p.x))
        PR = 0.0115
        c0 = fr + Vector((0.0, -PR - NR * 0.5, 0.0))
        hit = btree.find_nearest(c0)
        nrm = Vector(hit[1]) if hit[0] is not None else Vector((0, 0, 1))
        if nrm.z < 0:
            nrm = -nrm
        c0 = (Vector(hit[0]) + nrm * (0.0045 + 0.0015)) if hit[0] is not None else c0
        pd = b.P('pendant', COL['pendant'], 'torso', 60)
        k0 = len(pd.v)
        sphere(pd, (0.0, 0.0, 0.0), PR, 10, 6, s=(1.0, 1.0, 0.38))
        # (turn it to face along the chest's normal there, then move it to its place)
        zax = nrm.normalized()
        xax = Vector((1.0, 0.0, 0.0))
        yax = zax.cross(xax).normalized()
        xax = yax.cross(zax).normalized()
        pd.v[k0:] = [tuple(c0 + xax * v[0] + yax * v[1] + zax * v[2]) for v in pd.v[k0:]]
        tube(pd, tuple(c0 + yax * (PR * 0.85)), tuple(fr), 0.0016, 0.0016, 5)   # (the bail up to the cord)


# ------------------------------------------------------------------ the bun: one golden mass through the three spheres
def bun_sweep():
    C = [(y, z) for y, z, _ in ZOE_BUN]
    R = [r for _, _, r in ZOE_BUN]
    sub = lambda a, c: (a[0] - c[0], a[1] - c[1])
    add = lambda a, c, k=1.0: (a[0] + c[0] * k, a[1] + c[1] * k)
    unit = lambda a: (a[0] / math.hypot(*a), a[1] / math.hypot(*a))
    d0 = unit(sub(C[1], C[0]))
    st = []
    for k in range(1, 5):
        ph = math.pi / 2 * k / 4
        st.append((add(C[0], d0, -R[0] * math.cos(ph)), d0, R[0] * math.sin(ph), -math.cos(ph)))
    P = [add(C[0], sub(C[0], C[1]))] + C + [add(C[2], sub(C[2], C[1]))]

    def cr(i, t):
        p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        f = lambda a, c, d, e: 0.5 * ((2 * c) + (-a + d) * t + (2 * a - 5 * c + 4 * d - e) * t * t + (-a + 3 * c - 3 * d + e) * t ** 3)
        return (f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]))
    mid = [(C[0], R[0], 0.0)]
    for sg in range(2):
        for k in range(1, 6):
            t = k / 5
            c = cr(sg, t)
            union = max(math.sqrt(max(0.0, r * r - math.dist(c, ci) ** 2)) for ci, r in zip(C, R))
            hull = R[sg] + (R[sg + 1] - R[sg]) * t
            mid.append((c, max(union, union + (hull - union) * BUN_FILL), sg + t))
    tg = [d0] + [unit(sub(mid[min(j + 1, len(mid) - 1)][0], mid[j - 1][0])) for j in range(1, len(mid))]
    for _ in range(3):
        tg = [tg[0]] + [unit(add(add(tg[j - 1], tg[j], 2.0), tg[min(j + 1, len(tg) - 1)])) for j in range(1, len(tg))]
    st += [(c, d, r, u) for (c, r, u), d in zip(mid[1:], tg[1:])]
    c, d = C[2], tg[-1]
    for k in range(1, 4):
        ph = math.pi / 2 * k / 4
        st.append((add(c, d, R[2] * math.sin(ph)), d, R[2] * math.cos(ph), 2 + 0.6 * math.sin(ph)))
    return st, add(C[0], d0, -R[0]), add(c, d, R[2])


BUN_U = {}


def w_bun(p):
    return {'head': 1.0}   # (CHAR-OPEN: the bun rides the head; it was passed along tail0..2 like a ponytail)


# ZOE-LOOK-38: the ponytail. Tied high at the back of the crown in a green band, it rises tall, leans a little forward at
# the top, arcs over and falls behind her head, and its tip curls under and in. Its middle line runs past the skeleton's
# three ponytail bones (tail0-2, children of the head, which rig.js swings with lag), so its base rides the head and the
# rest follows through; it stays 5-8 cm clear of the back of her head at rest. (y, z, radius) in H on the middle plane.
PONY = [(0.972, -0.060, 0.016, 0.0), (0.998, -0.066, 0.0165, 0.0), (1.020, -0.069, 0.024, 0.0), (1.038, -0.082, 0.030, 0.001),
        (1.045, -0.104, 0.032, 0.003), (1.037, -0.126, 0.030, 0.006), (1.016, -0.143, 0.026, 0.010), (0.987, -0.155, 0.020, 0.015),
        (0.958, -0.162, 0.015, 0.019), (0.936, -0.158, 0.010, 0.022), (0.927, -0.146, 0.0065, 0.023), (0.935, -0.135, 0.0025, 0.023)]
# ((y, z, radius, x) in H: past the top it drifts a little to her left, so from the front it reads as a curve, not a pin)
PONY_N, PONY_W, PONY_D = 12, 1.12, 0.9   # (sides; the section wider across than deep)
TIE = (0.998, 0.0125, 0.0035)            # (the band: from where it starts (y, H), how long along the tail (H), how proud (m))


def pony_build():
    st = catmull(PONY, 2)
    ss = [0.0]
    for p0, p1 in zip(st, st[1:]):
        ss.append(ss[-1] + math.dist(p0[:2], p1[:2]))
    tg = []
    for i in range(len(st)):
        a_, c_ = st[max(0, i - 1)], st[min(len(st) - 1, i + 1)]
        d = (c_[0] - a_[0], c_[1] - a_[1])
        L = math.hypot(*d)
        tg.append((d[0] / L, d[1] / L))

    def at(sv):
        for i in range(len(ss) - 1):
            if ss[i] <= sv <= ss[i + 1]:
                t = (sv - ss[i]) / (ss[i + 1] - ss[i])
                c = tuple(st[i][k] + (st[i + 1][k] - st[i][k]) * t for k in range(4))
                d = (tg[i][0] + (tg[i + 1][0] - tg[i][0]) * t, tg[i][1] + (tg[i + 1][1] - tg[i][1]) * t)
                L = math.hypot(*d)
                return c, (d[0] / L, d[1] / L)
        return st[-1], tg[-1]

    def section(c, d, r, n, x0=0.0):
        ny, nz = -d[1], d[0]
        return [m((x0 + r * PONY_W * math.cos(2 * math.pi * i / n), c[0] + ny * r * PONY_D * math.sin(2 * math.pi * i / n), c[1] + nz * r * PONY_D * math.sin(2 * math.pi * i / n))) for i in range(n)]
    bonez = {k: (B[k]['p'][1] / ZH, B[k]['p'][2] / ZH) for k in ('tail0', 'tail1', 'tail2')}
    s_of = {k: ss[min(range(len(st)), key=lambda i: math.dist(st[i][:2], q))] for k, q in bonez.items()}
    s_tie = ss[min(range(len(st)), key=lambda i: abs(st[i][0] - TIE[0]) + (99 if i > len(st) // 2 else 0))]
    plan = [('head', s_tie), ('tail0', s_of['tail0']), ('tail1', s_of['tail1']), ('tail2', s_of['tail2'])]

    def wts(sv):
        if sv <= plan[0][1]:
            return {'head': 1.0}
        for (b0, s0), (b1, s1) in zip(plan, plan[1:]):
            if sv <= s1:
                t = smooth(s0, s1, sv)
                return {k: v for k, v in ((b0, 1 - t), (b1, t)) if v > 1e-4}
        return {'tail2': 1.0}
    PU = {}
    pt = b.P('ponytail', COL['hair'], lambda p: PU[tuple(round(c, 6) for c in p)], 80)
    rings_p = []
    for (y, z, r, x0), d, sv in zip(st, tg, ss):
        rr = section((y, z), d, r, PONY_N, x0)
        for q in rr:
            PU[tuple(round(c, 6) for c in q)] = wts(sv)
        rings_p.append(rr)
    loft(pt, rings_p, cap_top=True)
    tip = pt.v[-1]
    PU[tuple(round(c, 6) for c in tip)] = wts(ss[-1])
    f0 = pt.f[PONY_N * 3]
    a_, b_, c_ = (Vector(pt.v[i]) for i in f0[:3])
    cen = sum((Vector(pt.v[i]) for i in f0), Vector()) / len(f0)
    j3 = 3
    if (b_ - a_).cross(c_ - a_).dot(cen - Vector(m((st[j3][3], st[j3][0], st[j3][1])))) < 0:
        pt.f = [list(reversed(f)) for f in pt.f]
    # the band: a green ring round the tail where it is tied, with a lip at either end (thickness)
    bd = b.P('hairband', COL['trim'], lambda p: PU[tuple(round(c, 6) for c in p)], 50)   # (weighted as the tail under it)
    rb = []
    for sv, o in ((s_tie, 0.0004), (s_tie, TIE[2]), (s_tie + TIE[1], TIE[2]), (s_tie + TIE[1], 0.0004)):
        c, d = at(sv)
        rb.append(section((c[0], c[1]), d, c[2] + o / ZH, PONY_N, c[3]))
        for q in rb[-1]:
            PU[tuple(round(x, 6) for x in q)] = wts(sv)
    k0 = len(bd.f)
    loft(bd, rb)
    f0 = bd.f[k0 + PONY_N]
    a_, b_, c_ = (Vector(bd.v[i]) for i in f0[:3])
    cen = sum((Vector(bd.v[i]) for i in f0), Vector()) / len(f0)
    cc = at(s_tie + TIE[1] / 2)[0]
    if (b_ - a_).cross(c_ - a_).dot(cen - Vector(m((cc[3], cc[0], cc[1])))) < 0:
        bd.f = bd.f[:k0] + [list(reversed(f)) for f in bd.f[k0:]]
    return {k: round(v, 4) for k, v in s_of.items()}, round(s_tie, 4), round(ss[-1], 4)


if LOOK38:
    print('ponytail (bone arc positions, tie, length; H):', pony_build())
else:
    bun = b.P('bun', COL['hair'], w_bun, 80)
    bun.normal = HAIR_UP
    stations, front, tipp = bun_sweep()
    hv, hf, us = [], [], []
    for (cy, cz), (ty, tz), r, u in stations:
        ny, nz = -tz, ty
        for i in range(BUN_M):
            a = 2 * math.pi * i / BUN_M
            hv.append(m((r * math.sin(a), cy + ny * r * math.cos(a), cz + nz * r * math.cos(a))))
            us.append(u)
    nr = len(stations)
    for j in range(nr - 1):
        for i in range(BUN_M):
            a, c_ = j * BUN_M + i, j * BUN_M + (i + 1) % BUN_M
            hf.append([a, c_, c_ + BUN_M, a + BUN_M])
    hv.append(m((0.0, front[0], front[1])))
    us.append(stations[0][3] - 0.0001)
    hv.append(m((0.0, tipp[0], tipp[1])))
    us.append(2.6)
    f0, f1 = len(hv) - 2, len(hv) - 1
    hf += [[f0, (i + 1) % BUN_M, i] for i in range(BUN_M)]
    o = (nr - 1) * BUN_M
    hf += [[f1, o + i, o + (i + 1) % BUN_M] for i in range(BUN_M)]
    bun.add(hv, hf)
    for p, u in zip(bun.v, us):
        BUN_U[tuple(round(c, 6) for c in p)] = u

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
tris = b.export(OUT)
# The face's lower half (the snout, the chin) faces down, where our ramp runs toward black (the original's skin ramp
# stops at a mid brown, palette 32): its normals are bent a little up and forward so the face keeps a mid shade.
J = json.load(open(OUT))
skin_rgb = [int(COL['skin'][i:i + 2], 16) for i in (1, 3, 5)]
bend = Vector((0.0, 0.5, 0.85)).normalized()
for v in range(len(J['pos']) // 3):
    x, y, z = J['pos'][3 * v:3 * v + 3]
    if J['col'][3 * v:3 * v + 3] == skin_rgb and y > 0.845 * ZH and z > -0.02 * ZH:
        n = Vector(J['nrm'][3 * v:3 * v + 3])
        k = 0.45 * smooth(0.0, 0.03 * ZH, z + 0.02 * ZH)
        J['nrm'][3 * v:3 * v + 3] = [round(c, 4) for c in (n + bend * k).normalized()]
json.dump(J, open(OUT, 'w'), separators=(',', ':'))
print('zoe tris', tris, '->', OUT)
if BLEND:
    os.makedirs(os.path.dirname(os.path.abspath(BLEND)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
    print('blend', BLEND)
