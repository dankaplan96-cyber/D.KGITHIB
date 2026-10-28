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
from lbapoly import Builder, lerp, lip_band, loft, mouth_lens, ring, smooth, sphere, tube  # noqa: E402

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


ys = [0.404 + 0.014 * k for k in range(int((0.818 - 0.404) / 0.014) + 1)] + [0.818, 0.826]
ys = sorted(set(round(y, 4) for y in ys))
NB = 32
body_rings = [ring(y * ZH, sec(y)[0] * ZH, sec(y)[1] * ZH, sec(y)[2] * ZH, NB, 0.72) for y in ys]
skin = b.P('skin', COL['skin'], w_body, 50)
dress = b.P('dress', COL['red'], w_body, 50)
split_loft(body_rings, outfit_field, skin, dress)

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
ARM_N = 12


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
    el, hd = tuple(E0), tuple(H0)
    build_hand(b.P('hand' + s_, COL['skin'], 'hand' + s_, 55), Vector(el), Vector(hd), sx, b.P('fingers' + s_, COL['skinLine'], 'hand' + s_, 30))

# ------------------------------------------------------------------ neck and head
neckY, headY = bp('neck')[1], bp('head')[1]
tube(b.P('neck', COL['skin'], lambda p: {'neck': 1 - smooth(headY - 0.02, headY + 0.04, p[1]), 'head': smooth(headY - 0.02, headY + 0.04, p[1])}, 60),
     (0, neckY - 0.05, -0.03), (0, 0.875 * ZH, -0.03), 0.042, 0.038, 12)   # (ZOE-OPEN: 12 sides, was 10)
HK = 13   # points per half-contour after resampling


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


head_rings = []
for y, half in (ZOE_HEAD_LBA2 if os.environ.get('ZOE_HEAD_LBA2') else head_design()):
    h = resample(half, HK)
    head_rings.append([m((x, y, z)) for x, z in h] + [m((-x, y, z)) for x, z in reversed(h[1:-1])])
hpart = b.P('head', COL['skin'], 'head', 70)
loft(hpart, head_rings)
n_, o_ = len(head_rings[0]), len(hpart.v)
hpart.add([m(CHIN if os.environ.get('ZOE_HEAD_LBA2') else CHIN2), m(CROWN)], [])
hpart.f += [[(i + 1) % n_, i, o_] for i in range(n_)] + [[(len(head_rings) - 1) * n_ + i, (len(head_rings) - 1) * n_ + (i + 1) % n_, o_ + 1] for i in range(n_)]
# the face features lie on the head's surface: ray-cast from the front onto it
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
        for q in ([T[k], T[k + 1], M[k + 1], M[k]], [M[k], M[k + 1], Lo[k + 1], Lo[k]]):
            q = [p for i, p in enumerate(q) if p not in q[:i]]
            if len(q) >= 3:
                face_poly(lips, q, 0.003, 2)
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
        strip(feat('brow', COL['brown']), [(sxx * x, y) for x, y in BROW], 0.0024, 0.003)
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
    loop = []
    for k in range(14):
        t = 2 * math.pi * k / 14
        z, y = ez + er * math.sin(t), ctr_y - er * math.cos(t)
        s_top = max(0.0, -math.cos(t))            # (the upper half drawn in and up to the hook)
        z = ez + (z - ez) * (1 - 0.75 * s_top ** 1.5)
        y = y + s_top ** 1.5 * (ehy - (ctr_y + er))
        loop.append(m((sxx * exx, y, z)))
    ep = b.P('earring', COL['blue'], 'head', 60)
    rings_e = []
    for k in range(14):
        p0, pp, pn = Vector(loop[k]), Vector(loop[k - 1]), Vector(loop[(k + 1) % 14])
        tg = (pn - pp).normalized()
        u = Vector((1.0, 0.0, 0.0))
        w = tg.cross(u).normalized()
        rings_e.append([tuple(p0 + u * (math.cos(2 * math.pi * i / 4) * 0.0032) + w * (math.sin(2 * math.pi * i / 4) * 0.0032)) for i in range(4)])
    for k in range(14):
        a_, c_ = rings_e[k], rings_e[(k + 1) % 14]
        mid_ = (Vector(loop[k]) + Vector(loop[(k + 1) % 14])) / 2
        for i in range(4):
            q = [a_[i], a_[(i + 1) % 4], c_[(i + 1) % 4], c_[i]]
            v0, v1, v2 = (Vector(x) for x in q[:3])
            if (v1 - v0).cross(v2 - v0).dot(sum((Vector(x) for x in q), Vector()) / 4 - mid_) < 0:
                q.reverse()
            ep.add(q, [[0, 1, 2, 3]])

# ------------------------------------------------------------------ the necklace: laid on the skin round the neck
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
nk = b.P('necklace', COL['blue'], lambda p: {'torso': 1 - smooth(0.80 * ZH, 0.84 * ZH, p[1]), 'neck': smooth(0.80 * ZH, 0.84 * ZH, p[1])}, 30)
for k in range(len(lay) - 1):
    tube(nk, lay[k], lay[k + 1], 0.0045, 0.0045, 5)


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
