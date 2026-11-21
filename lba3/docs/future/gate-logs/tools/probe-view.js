(() => { P.settle(); for (let i = 0; i < 30; i++) game.step(1 / 30); return P.state(); })()
