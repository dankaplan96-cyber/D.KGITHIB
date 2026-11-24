# KELL-LINES: Kell's and Irsa's later-chapter lines (the user's pick, 24.11)

Worker KELL-LINES, 24.11.2026, from ccr-c1c2c4b9-dep6ed d05cd337. All results are **automated runtime only** (headless
Chromium, SwiftShader). No person has played this.

## The fault
story/zeelift.js LiftThread.talk has its own lines for Kell and Irsa once chapter 3 is over (zt_kell_later,
zt_irsa_later, and zt_kell_after / zt_irsa_after when Vesk was not brought down). That talk is only asked by chapter 3's
own object (chapter2.js talk), and later chapters never go through chapter 3. So from chapter 4 on, both said their
generic idle lists (thread.js idle_zl_kell / idle_zl_irsa). SECOND-SHIFT part 2 fixed the same cause for the epilogue by
routing Kell and Brel from story/zeelife.js talkFirst; this work uses the same route.

## What changed
- story/zeelife.js talkFirst: Kell and Irsa are now sent to the lift thread's talk in every chapter after chapter 3
  except the council's (chapter 9 keeps its own Mill Lane talk, zeelift.js KellThread, and its idle fallback), both
  campaigns, but only in games that played the lift (zt_v). A game that never did keeps the idle lines, as Brel does.
  The epilogue route for Kell and Brel is unchanged.
- story/zeelift.js LiftThread.talk, the not-chapter-3 branch: it now picks with the same flag chapter 3's own branch
  reads: c2_veskDown -> zt_kell_later / zt_irsa_later, otherwise zt_kell_after / zt_irsa_after. Kell's bread line in
  free play, Kell's epilogue line and the chapter-3 scene are untouched.
- Chapters with their own talk for these two still come first, because zeelife.js is asked after the current chapter:
  the network chapter's Irsa (netline.js nw_irsa_*) and chapter 9's Kell, Irsa and Brum.
- No new text and no new files. The keys and their Hebrew already exist.

## What the player now hears (zt_v games)
| When | Kell | Irsa |
|---|---|---|
| ch 4–8 (both campaigns), base 10–12 / expanded 10–16 | "The chief gave us the mill line that day. I don't know what to think of the rest." | "The chief kept us in water for ten years. And he knew about that kick. Both are true. I do not like it either." |
| network chapter, its thread on | (as above) | nw_irsa_* as before |
| ch 9 | as before (KellThread lines, else idle) | as before |
| epilogue | "She runs off the mills now..." as before; free play bread line as before | **new to the game:** "Baldino brought me the shield readings. No more three and a rest. I took the strip down from over my bench." (zt_irsa_home was unreachable for the same reason) |

## The sweep (every case of the same cause)
Method: every talk / talkFirst / talkLater body in src/game/story was scanned for branches that only run when their
owner is not the current chapter (!cur, !isCur(), cur?.key checks, story.index), plus a scan of English keys never named
in code (scratchpad sweep.mjs, deadkeys.mjs).
- zeelift.js LiftThread.talk is the only chapter-owned talk with not-current branches. Its cases:
  Kell zt_kell_later / zt_kell_after (wired), Irsa zt_irsa_later / zt_irsa_after (wired), Irsa zt_irsa_home (wired,
  epilogue), Kell zt_kell_home and zt_kell_bread (already routed by part 2), Kell zt_kell_idle and Irsa zt_irsa_idle
  (not routed: the same text is the first entry of their idle lists, which games without the lift still use),
  Brel zt_brel_idle (not routed outside the epilogue: the same text is in idle_zl_brel, already shown).
- Every other chapter's talk returns false when it is not current (dig, steam, pass, observatory, evacuation, council,
  throttle, ballastra, balances, network), and later-chapter people are served by objects that are asked every chapter
  (zeelife, hamlife, deeplife, life, the survey's talkLater). No other character has later lines stranded this way.
- Unused keys found that are a different cause (superseded text, not routing): cn_lane_kell2 (replaced by
  cn_lane_kell2b), cn_iso_again, ev_kick_2, zt_note, th_zoe_more, c5_kesh_1, c4_guard_storm. Not changed.

## Decisions for the user
1. **Irsa's epilogue line.** (A) as built: she says zt_irsa_home in the epilogue (her own line, written for it, Hebrew
   present). (B) keep her idle lines in the epilogue.
2. **Chapter 9.** Kell and Irsa there still fall back to their idle lines when the council chapter's own Mill Lane talk
   has nothing to say. (A) as built. (B) also give them the later lines there.
3. **Brum at Mill Lane's handle after chapter 9** has no later lines of his own (idle lines); none exist to wire.

## Checks (automated)
- Short check (scratchpad kell-lines/check.mjs, log check.log), by input (P.talk walks up and presses E); Zeelich entered
  by enterRoom when the save stood elsewhere: exp-08-steam (expanded, ch 6 pass): Kell zt_kell_later, Irsa
  zt_irsa_later; base-13-network (base, ch 11 shell): the same; base-15-free-play (base, epilogue): Kell zt_kell_home,
  Irsa zt_irsa_home. 6/6 PASS, no errors.
- tests/second-shift.mjs ONLY=GH, once (G: older saves past chapter 9, Mill Lane as before; H: free play, Kell's bread
  line, Save & quit, no lesson): 6/6 PASS, no errors. E (chapter 9's lesson) was not run: that chapter's code path is
  unchanged (the new route skips the council chapter).

## Not verified
A person playing; Hebrew in the game (no text changed); chapter 9 (code unchanged there, not run); the expanded
campaign's chapters 10–16 by run (same code path as base, which was run).
