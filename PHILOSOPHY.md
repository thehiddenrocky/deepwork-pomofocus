# The Deep Work Philosophy: PomoFocus

*A Performance Engineer's approach to human attention.*

In performance engineering, we obsess over CPU context switching and latency. But for humans, the "switching cost" is even higher. Cal Newport's *Deep Work* defines "Attention Residue" as the cognitive tax we pay every time we shift our focus, even for a second.

This project, PomoFocus, was not built because the world needs another timer. It was built because most productivity tools introduce cognitive overhead and mechanical friction that actively break flow states.

## Core Engineering Principles

1. **Zero-Latency State Changes (Keyboard First)**
   Every time you reach for your mouse, you risk a context switch. PomoFocus is designed to be 100% keyboard-driven. `Space` toggles the timer. `k` acknowledges the alarm. `/` logs a thought. Your hands never leave the home row.

2. **Gamifying the Lead Measure (Not the Lag Measure)**
   We often track "lag measures"—tickets closed or features shipped. PomoFocus rigorously tracks the "Lead Measure": uninterrupted hours of deep focus. It streams every session into an immutable local `pomofocus-logs.csv` and rewards completions with high-speed UI animations and audio synthesis, training the brain's dopamine loop for deep work rather than distraction.

3. **Draining the Shallows (Intentionality Protocol)**
   A timer alone doesn't prevent you from spending 25 minutes on low-value tasks (Shallow Work). PomoFocus enforces a "Protocol of Intent"—a mandatory Session Note field at the end of every block. This 5-second reflection forces a micro-audit: *Was I doing deep work, or was I caught in the shallows?*

4. **Subconscious Progress Tracking**
   Reading numbers (`24:59`) requires conscious cognitive effort. PomoFocus uses a hardware-accelerated SVG Progress Ring, designed to be tracked by your peripheral vision. It reduces the mental energy required to "check the time."

By eliminating mechanical friction and gamifying focus time, PomoFocus acts as a frictionless environment for deep, meaningful work.
