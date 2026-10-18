#!/usr/bin/env python3
# SRC-2 (REV-V-1 D1): the Dino-Fly's folded wing, solved from target directions in the body's frame, printed as
# src/game/dinofly.js DOZE rows (degrees, Euler order XZY, left side; the right side mirrors).
#
#   python3 dinofly-fold.py [--back 0.15,-0.2,-1] [--fwd 0.08,0.05,1] [--hand 0.12,-0.12,-1] [--slope 0.9,0.42,0]
#
# The wing's three bones (tools/blender/dinofly_poly.py: shoulder (360, 1100, 0) → elbow (800, 1100, 300) → wrist
# (1400, 1100, 200) → tip (1700, 1090, -500), the membrane in the y = 1100 plane, its trailing edge behind) fold
# as a resting flier folds them: the arm back along the flank, the forearm forward over it, the hand back again.
# Each segment's membrane lies in one plane, the flank's slope (`--slope`: its outward normal, tilted up like a cloak
# on the shoulders), with its trailing edge hanging DOWN — the segment that points forward is turned over (its
# membrane's other face out) so its trailing edge hangs down too, instead of standing up as a board. The membrane
# hinges (mem0..2) stay straight: every panel flat in the slope, overlapping like a folded cloak, not pleated.
import argparse
import math

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--back', default='0.15,-0.2,-1')
ap.add_argument('--fwd', default='0.08,0.05,1')
ap.add_argument('--hand', default='0.12,-0.12,-1')
ap.add_argument('--slope', default='0.45,0.89,0')
ap.add_argument('--droop', type=float, default=55.0, help='degrees the membrane\'s back band bends down on its fold line')
ap.add_argument('--tuck', action='store_true', help='bend the back band in toward the belly instead of down')
ap.add_argument('--spread', type=float, default=5.0, help='degrees each later panel turns further out (no z-fighting)')
a = ap.parse_args()
v = lambda s: np.array([float(x) for x in s.split(',')])
unit = lambda x: x / np.linalg.norm(x)

REST = [np.array([440.0, 0, 300]), np.array([600.0, 0, -100]), np.array([300.0, -10, -700])]
UP = np.array([0.0, 1, 0])


def frame(d, n):
    d = unit(d)
    n = unit(n - d * np.dot(n, d))
    return np.stack([d, n, np.cross(d, n)], 1)   # columns: along, normal, third


def solve(d, slope):
    """the rotation taking the rest segment (its direction, normal +y) to direction d with its membrane in the
    slope's plane and its trailing edge (rest: n × a) pointing out and down"""
    best = None
    for sgn in (1, -1):
        F = frame(d, sgn * slope)
        trailing = np.cross(F[:, 1], F[:, 0])
        score = trailing[0] - trailing[1]
        if best is None or score > best[0]:
            best = (score, F)
    return best[1]


def axis_angle(ax, t):
    ax = unit(ax)
    K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]])
    return np.eye(3) + math.sin(t) * K + (1 - math.cos(t)) * K @ K


def rot_y_about(axis_deg, vec):
    t = math.radians(axis_deg)
    c, s = math.cos(t), math.sin(t)
    # turn the slope's normal further out (about the body's long axis z)
    return np.array([vec[0] * c + vec[1] * s, -vec[0] * s + vec[1] * c, vec[2]])


def euler_xzy(R):
    """three.js Euler order 'XZY': R = Rx · Rz · Ry"""
    # R = Rx(a) Rz(c) Ry(b); R[0,1] = -sin c
    c = math.asin(max(-1, min(1, -R[0, 1])))
    a_ = math.atan2(R[2, 1], R[1, 1])
    b = math.atan2(R[0, 2], R[0, 0])
    return [round(math.degrees(x), 1) for x in (a_, b, c)]


targets = [v(a.back), v(a.fwd), v(a.hand)]
slope = unit(v(a.slope))
absR = []
for k, (rest, d) in enumerate(zip(REST, targets)):
    F_rest = frame(rest, UP)
    F_want = solve(d, rot_y_about(-a.spread * k, slope))
    absR.append(F_want @ F_rest.T)
loc = [absR[0], absR[0].T @ absR[1], absR[1].T @ absR[2]]
for k, R in enumerate(loc):
    print('  wing%dL: %s,' % (k, euler_xzy(R)))
# the membrane's back band: hinged on its fold line (local axes as dinofly_poly.py prints them), bent down over the flank
HINGE = [np.array([408.0, 0, 54]), np.array([276.0, 0, 63]), np.array([295.0, 0, -421])]
for k, ax in enumerate(HINGE):
    tr = np.cross(UP, unit(ax))   # (a direction across the fold line, toward the trailing edge: rest −z side)
    if tr[2] > 0:
        tr = -tr
    best = None
    for sg in (1, -1):
        Rm = axis_angle(ax, sg * math.radians(a.droop))
        w = absR[k] @ (Rm @ tr)
        key = w[0] if a.tuck else w[1]
        if best is None or key < best[0]:
            best = (key, Rm)
    print('  mem%dL: %s,' % (k, euler_xzy(best[1])))
# check: the world positions of the joints (body frame, units)
p = np.array([360.0, 1100, 0])
for k, rest in enumerate(REST):
    q = p + absR[k] @ rest
    print('  # joint %d → (%d, %d, %d)' % (k + 1, *q))
    p = q
